GPS and telemetry datalogger based on Arduino and Raspberry Pi.  It
can log GPS, RPM, TPS, and Brake Pressure data at 10Hz and up to 6 additional
analog channels. Data sampling is
synchronized to the GPS clock (to within about 10ms) and is logged in
a CSV format which is compatible with the data analysis app.


## TODO:

- [X] GPS sampling
- [X] Analog sampling
- [X] Measure RPM
- [X] Use GPS PPS signal for sample synchronization
- [X] Use a single arduino
- [ ] Schematics and Photos
- [ ] Proper input filtering
- [ ] Convert to use Pi Zero
- [ ] Touch screen
- [ ] Live lap timing
- [ ] Configuration
 - [ ] Track start[ ]finish line
 - [ ] Track sector dividers
 - [ ] Track name
 - [ ] Enable/disable/rename analog channels
 - [ ] Calibrate analog sensor ranges (for TPS & brakes)
 - [ ] Calibrate RPM pulses per rotation
- [ ] Touch[ ]screen UI
- [ ] Web[ ]app UI
- [ ] Run pi wireless in hotspot mode

### Wish List
- [ ] Higher sampling rate
  - [ ] Faster GPS
