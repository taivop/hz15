from __future__ import print_function
from __future__ import division

import os
import usb.core
import datetime
import urllib2
import time
import logging
logging.basicConfig(filename='backend.log',format='%(asctime)s %(levelname)s:%(message)s',level=logging.DEBUG)

def open_sensor_connection(ip, mac):
	os.environ["USBIP_SERVER"] = ip
	device = usb.core.find(address=int("0022bdcf4734", 16))  # Find using mac address
	if device is None:
		raise ValueError('Device not found')
	device.set_configuration()
	return device

def main():
	
	## parse the commandline arguments
	import argparse
	parser = argparse.ArgumentParser(description='The backend program that gathers the data from the sensor and optionally pushes it to the server.')
	parser.add_argument('--nolocal', action='store_true', help='Do not store the measurment values locally.')
	parser.add_argument('--remote', action='store_true', help='Store the measurment values on a remote server.')
	parser.add_argument('--remoteprotocol', action='store', type=str, default='http://taivoapp.mybluemix.net/insert/?room={ROOM}&light={LIGHT}&temperature={TEMP}&humidity={HUMID}&motion={MOTION}&sound={SOUND}', help='The format of the command to upload a datapoint to the database server. Use placeholders {ROOM} for the room, {LIGHT} for the light sensor value, {TEMP} for the temperature, {HUMID} for the humidity, {MOTION} for the motion sensor value, {SOUND} for the sound sensor and {TS} for the timestamp')
	parser.add_argument('--room', action='store', type=str, default='ants', help='The name of the room the sensor data is from')
	parser.add_argument('--sensorip', action='store', type=str, default='10.0.4.1', help="IP address of the sensor switch")
	parser.add_argument('--samplingrate', action='store', type=float, default=1., help='The sampling rate of sensor data (samples per second)')
	parser.add_argument('--filesize', action='store', type=int, default=200, help='The number of datapoints to save per file')
	parser.add_argument('--sensormacaddress', action='store', type=str, default='0022bdcf4734', help='The hardware address of the sensor box (in hexadecimal)')
	args = parser.parse_args()
	
	device = open_sensor_connection(args.sensorip, args.sensormacaddress)
	if device is not None:
		print("Sensors successfully connected")
	
	while True:
		if not args.nolocal:
			filename = "data/" + args.room + '_' + datetime.datetime.utcnow().strftime('%Y%m%d_%H%M') + "_"
			i = 1
			while os.path.exists(filename + str(i) + ".csv"):
				i += 1
			filename = filename + str(i) + ".csv"
			print("Gathering data for file " + filename + ": ", sep='', end='')
			
			table = [None]*args.filesize
		
		for r in range(args.filesize):
			if (r%(args.filesize//10) == (args.filesize//10)-1): print('.', end='')
			
			data = device.read(1, 64)
			if (data[0x00] & 0x0f) == 0x0f:
				data0 = data[0x0b] | ((data[0x0c] & 0xf0) << 4)
				data1 = data[0x0d] | ((data[0x0c] & 0x0f) << 8)
				data2 = data[0x0e] | ((data[0x0f] & 0xf0) << 4)
				data3 = data[0x10] | ((data[0x0f] & 0x0f) << 8)
				data4 = data[0x11] | ((data[0x12] & 0xf0) << 4)
				data5 = data[0x13] | ((data[0x12] & 0x0f) << 8)
				data6 = data[0x14] | ((data[0x15] & 0xf0) << 4)
				data7 = data[0x16] | ((data[0x15] & 0x0f) << 8)
				
				timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%fZ')
				
				if not args.nolocal:
					table[r] = [timestamp, str(data1), str(data2), str(data3), str(data4), str(data5)]
				
				if args.remote:
					url = args.remoteprotocol.format(ROOM=args.room,LIGHT=data1,TEMP=data2,HUMID=data3,MOTION=data4,SOUND=data5,TS=timestamp)
					tries = 5
					while tries > 0:
						try:
							urllib2.urlopen(url, timeout=5).close()
							tries = 0
						except Exception as e:
							tries -= 1;
							if tries != 0:
								logging.warning("url request failed: " + str(e))
							else:
								logging.error("url (" + url + ") request failed: " + str(e))
				
				time.sleep(1/args.samplingrate)
		
		if not args.nolocal:
			print()
			file = open(filename, 'w')
			for r in table:
				file.write(', '.join(r) + '\n')
			file.close()

if __name__ == "__main__":
	main()