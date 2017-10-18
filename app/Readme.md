![screenshot](img/screen.png)

View telemetry data from RaceCapture, VBox, and custom logging
hardware. Calculate approximate lap times and comparisons between laps
(see issues below).

There is currently (very lightly tested) support for loading .log
files from RaceCapture loggers and CSV files from VBox loggers.

It can also load any CSV file which has at least the
following columns (in any order):

    Seconds,KMH,RPM,Lat,Lon,TPS,Brake

# Current issues:
- I don't know how to write good JavaScript yet (this is how I'm learning)
- Cumulative time comparison doesn't work
- Loading data is slow, and probably doesn't work properly for some datalogger configurations.
- Lap timing calculation has at least one bug which can introduce ~50ms errors
- It only works with data for two tracks in the South Island of New Zealand


