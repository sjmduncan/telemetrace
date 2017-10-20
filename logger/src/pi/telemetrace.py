#!/usr/bin/python3
import time
import math
import datetime
import serial
import signal # For Ctrl+C to exit
from tzwhere import tzwhere
import pytz

#tzw=tzwhere.tzwhere()
#print("tzwhere initialized");
usart=serial.Serial(
        port='/dev/ttyAMA0',
        baudrate=115200)

def signal_handler(signal, frame):
    print("Closing serial connection");
    usart.close()
    exit(0)

signal.signal(signal.SIGINT, signal_handler)

rpm_pps=2

minlogkmh=7
minlogkmh=-1

achans={
    'a1':'TPS',
    'a2':'BrakePress',
    'a2':'BrakePress',
    'a3':'a3',
    'a4':'a4',
    'a5':'a5'
    }

utctz=pytz.timezone('UTC')

def ParseLine(l):
    words  =l.replace(',\n','').replace('\n', '').split(',')
    line={}
    fix=True;
    if(words[1] != 'A'):
        fix = False;
    microseconds=int(words[0][7:])*1000
    seconds=int(words[0][4:6])
    minutes=int(words[0][2:4])
    hours=int(words[0][0:2])
    day=int(words[8][:2])
    month=int(words[8][2:4])
    year=int(words[8][4:6])+2000

    # GPS only reports time in UTC, convert it to localtime for the filename.
    line['utcdt'] = utctz.localize(datetime.datetime(year,month,day,hours,minutes,seconds,microseconds))
    line['localdt'] = line['utcdt'].astimezone(timezone)

    line['fix']=fix
    if(fix):
        # Convert NMEA [Deg][Minues-decimal] to [Deg-decimal]
        line['lat']=float(words[2][:2]) + float(words[2][2:])/60
        line['lon']=float(words[4][:3]) + float(words[4][3:])/60
        if(words[3] == "S"):
            line['lat'] = -line['lat']
        if(words[5] == "E"):
            line['lon'] = -line['lon']

        # Convert knots to kmh
        line['kmh']=float(words[6])*1.852001
    else:
        line['lat']=0
        line['lon']=0
        line['kmh']=0
        
    
    # This means we GPS-only
    if(len(words) == 9):
        return line

    # If more than 9 words then we have analog too
    line['a1']=int(words[9])
    line['a2']=int(words[10])
    line['a3']=int(words[11])
    line['a4']=int(words[12])

    # This means we GPS + Analog but no RPM
    if(len(words)==13):
        return line;

    # RPM is received as the time between pulses in microseconds
    rpm_pulse=float(words[13])
    if(rpm_pulse > 0):
        # rpm_pps is to correct for bad Arduino clock rate
        line['rpm'] = 60*1000000/rpm_pulse/rpm_pps
    else:
        line['rpm'] = 0
    return line


def MakeFileName(line):
    return line['localdt'].strftime("%Y_%m_%d-%H_%M_%S")+'.csv'
    
def DoLogging(line,tstart, file):
    tdiff=line['localdt']-tstart
    time=tdiff.total_seconds()
    linestr="{0:7.2f},{1:7.2f},{2:8.1f},{3:12.7f},{4:12.7f},{5:4.0f},{6:4.0f},{7:4.0f},{8:4.0f},{9:1.0f}".format(
        time,
        line['kmh'],
        line['rpm'],
        line['lat'],
        line['lon'],
        line['a1'],
        line['a2'],
        line['a3'],
        line['a4'],
        1 if line['fix']==True else 0)
    print(linestr)
    file.write(linestr+'\n')
    
csvheader="Seconds,KMH,RPM,Lat,Lon,TPS,Brake,a3,a4"
def MakeNewFile(line):
    fn = MakeFileName(line)
    file = open(fn, 'w')
    file.write(csvheader)
    file.write('\n')
    return file;

def ReadTimeZone():
    l=usart.readline().decode('utf-8')
    try:
        data=ParseLine(l)
        return pytz.timezone(tzw.tzNameAt(data['lat'],data['lon']))
    except Exception as e:
        usart.close()
        print("failed to parse timezone");
        print(e)
        exit()



def ReadLoop():
    usart.flushInput();
    usart.flushOutput();
    usart.readline();
    
    newdata=False
    logging=False
    modu=0
    tstart=''
    while True:
        data={}
        data['fix'] = False
        data['kmh']=-1
        try:
            l=usart.readline().decode('utf-8')
            data=ParseLine(l)
            newdata=True

            if(not data['fix']):
                print("no GPS Fix")
                
        except Exception as e:
            print("Failed to parse line")
            print(e)

        
        if(newdata and data['fix'] and not logging and data['kmh'] >= minlogkmh):
            try:
                #timezone=pytz.timezone('Pacific/Auckland')
                file=MakeNewFile(data)
                tstart=data['localdt']
                logging=True
                print("Logging started")
            except Exception as e:
                print("Can't create file")
                print(e)
        
        if(newdata and data['fix'] and logging):
            try:
                DoLogging(data,tstart,file)

                modu = (modu + 1)%10
                if modu == 0:
                    file.flush();
            except Exception as e:
                print("failed to log to file");
                print(e)

        if(newdata and data['fix'] and logging and data['kmh'] <= minlogkmh*0.8):
            try:
                file.flush()
                file.close()
                logging=False
                print("Slowed down too much, stopping logging")
            except Exception as e:
                print("Failed to close log file")
                print(e)
        newdata=False



timezone=pytz.timezone('Pacific/Auckland')


ReadLoop()
usart.close()

