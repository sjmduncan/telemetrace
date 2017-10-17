# Telemetrace-logger

This is based on a Pi Zero, an Arduino, and the Ultimate GPS module
from Adafruit. It can do logging at 10Hz (Lat/Lon/Speed + RPM + 8x
Analog) with sample-synchronization via the GPS clock PPS signal (samples should be synchronized to about +-10ms)


## TODO:

- Live lap timing (needs track awareness)
- Higher sampling rate
  - Faster GPS
  - More capable board
