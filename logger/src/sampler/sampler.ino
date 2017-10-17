#include <SoftwareSerial.h>
SoftwareSerial softSerial(10,11);


#define NMEA_MAX_LINE 120
#define PMTK_SET_NMEA_UPDATE_10HZ "$PMTK220,100*2F"
#define PMTK_SET_NMEA_OUTPUT_RMCONLY "$PMTK314,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*29"
#define PMTK_API_SET_FIX_CTL_5HZ "$PMTK300,200,0,0,0,0*2F"
#define PMTK_SET_BAUD_57600 "$PMTK251,57600*2C"

#define BAUD_GPS 57600

#define BAUD_PI 115200

#define RPM_BUFF_SIZE 4
#define PPS_BUFF_SIZE 4

#define ANALOG_NUM_CHANNELS 4

#define PIN_RPM_IRQ 3
#define PIN_PPS_IRQ 9

volatile char           sentence_buff[NMEA_MAX_LINE];
bool                    sentence_started=false;
bool                    sentence_finished=false;
int                     sentence_buff_pos=0;
unsigned long           sentence_idle_start_micros;

// Count RPM in microseconds
volatile unsigned long  rpm_micros_buff[RPM_BUFF_SIZE];
volatile unsigned long  rpm_last_micros=0;
uint8_t                 rpm_buff_pos=0;
unsigned long           rpm_current_micros;

// Count RPM in microseconds
volatile unsigned long  pps_micros_buff[PPS_BUFF_SIZE];
volatile unsigned long  pps_last_micros=0;
uint8_t                 pps_buff_pos=0;
unsigned long           pps_current_micros;

// Store analog channels
volatile unsigned int   analog_buffer[ANALOG_NUM_CHANNELS];



byte b;
uint8_t i;
unsigned long last_pps_sample;
unsigned long pps_next;
bool doSample=false;
bool haveSample=false;
uint8_t sample_count=0;

void setup() {
  // LED on for configuration & setup
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  // Wait for the GPS to boot
  delay(1000);
  
  // Attempt to change the GPS baud rate
  Serial.begin(9600);
  Serial.println(PMTK_SET_BAUD_57600);
  delay(20);
  Serial.end();

  // Restart the serial connection with the correct baud rate.
  Serial.begin(BAUD_GPS);

  // Configure GPS for 10Hz update rates without any extra outputs
  Serial.println(PMTK_API_SET_FIX_CTL_5HZ);
  delay(20);
  Serial.println(PMTK_SET_NMEA_OUTPUT_RMCONLY);
  delay(20);
  Serial.println(PMTK_SET_NMEA_UPDATE_10HZ);
  delay(20);  

  // Start software serial for passing data to the pi
  softSerial.begin(BAUD_PI);

  // Setup IRQ for measuring RPM
  attachInterrupt(digitalPinToInterrupt(PIN_RPM_IRQ), irq_pps, RISING);

  for(i=0; i<PPS_BUFF_SIZE; i++){
    // PPS is nominally 1e6 micros, initialize that here so that it converges to the 
    // arduino-time value faster after initialization.
    pps_micros_buff[i]=999999;
  }
  // LED off after config/setup finished
  digitalWrite(LED_BUILTIN, LOW);
}


void loop() {
  if(last_pps_sample != pps_last_micros){
    last_pps_sample = pps_last_micros;
    pps_next=last_pps_sample+pps_current_micros/10;
    doSample=true;
    sample_count=0;
  }else if(micros() > pps_next){
    pps_next+=+pps_current_micros/10;
    doSample=true;
  }
  if(doSample && sample_count <= 9){
      
      digitalWrite(LED_BUILTIN, HIGH);
      sample();

      
  }
  if(Serial.available()){
    
    b=Serial.read();
    
    if(b == '$'){
      digitalWrite(LED_BUILTIN, LOW);

      if(!sentence_started){
        sentence_started=true;
      }
      sentence_buff_pos=0;
      sentence_finished = false;
    }else if (b == '*'){
      sentence_finished = true;
    }else if(sentence_started){
      
      if(!sentence_finished){
      sentence_buff[sentence_buff_pos]=b;
      sentence_buff_pos++;
      }
    }
    sentence_idle_start_micros = millis();
  }

  if( sentence_started 
   && sentence_buff_pos > 0 
   &&  millis() - sentence_idle_start_micros > 5){
    if(!haveSample){
      softSerial.print('!');
      sample();
      digitalWrite(LED_BUILTIN, HIGH);
    }
    int numCommas = 0;
    for(int p=0; p< sentence_buff_pos-1; p++){
      
      if(numCommas > 0)
        softSerial.print(sentence_buff[p]);
      if(sentence_buff[p] == ',')
        numCommas++;

      if(numCommas > 9)
        break;

    }
    for(i=0;i<ANALOG_NUM_CHANNELS; i++){
      softSerial.print(analog_buffer[i]);
      softSerial.print(',');
    }
    softSerial.print(pps_current_micros);
    
    softSerial.print('\n');    
    sentence_started = false;
    haveSample=false;
  }
}

void sample(){
          // Sample analog channels
      for(i=0; i<ANALOG_NUM_CHANNELS; i++){
        analog_buffer[i] = analogRead(i);
      }

      unsigned long rpm_total_micros = 0;
      for(i=0; i<RPM_BUFF_SIZE; i++){
        rpm_total_micros=rpm_total_micros+rpm_micros_buff[i];
      }
      rpm_current_micros=rpm_total_micros/RPM_BUFF_SIZE;
            doSample=false;
      haveSample=true;
      sample_count++;
}


// IRQ for measuring the time between rising edges on the RPM IRQ pin
void irq_rpm(){
  unsigned long now_micros = micros();
  rpm_micros_buff[rpm_buff_pos]=now_micros-rpm_last_micros;
  rpm_buff_pos = (rpm_buff_pos+1)%RPM_BUFF_SIZE;
  rpm_last_micros=now_micros;
}


// IRQ for the rising edge of the PPS signal from the GPS module.
// This is to correct for Arduinos low clock accuracy
void irq_pps(){
  unsigned long now_micros = micros();
  if(pps_last_micros != 0){
    pps_micros_buff[pps_buff_pos]=now_micros-pps_last_micros;
    pps_buff_pos = (pps_buff_pos+1)%PPS_BUFF_SIZE;
    
    unsigned long pps_total_micros = 0;
    for(i=0; i<PPS_BUFF_SIZE; i++){
      pps_total_micros=pps_total_micros+pps_micros_buff[i];
    }
    pps_current_micros=pps_total_micros/PPS_BUFF_SIZE;
  }
  pps_last_micros=now_micros;
}

