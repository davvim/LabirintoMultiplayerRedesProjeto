from scapy.all import sniff, TCP, UDP, IP
import csv
import json
from datetime import datetime

PORT = 3001  # Your game server port
LOG = []

def packet_callback(pkt):
    if IP in pkt:
        proto = 'TCP' if TCP in pkt else 'UDP' if UDP in pkt else 'Other'
        src = f"{pkt[IP].src}:{pkt[TCP].sport if TCP in pkt else pkt[UDP].sport if UDP in pkt else ''}"
        dst = f"{pkt[IP].dst}:{pkt[TCP].dport if TCP in pkt else pkt[UDP].dport if UDP in pkt else ''}"
        size = len(pkt)
        timestamp = datetime.now().isoformat()
        # Classify WebSocket handshake (port 3001, TCP, HTTP Upgrade)
        if proto == 'TCP' and (pkt[TCP].dport == PORT or pkt[TCP].sport == PORT):
            if b'Upgrade: websocket' in bytes(pkt[TCP].payload):
                proto = 'WebSocket-Handshake'
            else:
                proto = 'WebSocket-Data'
        entry = {
            'timestamp': timestamp,
            'src': src,
            'dst': dst,
            'size': size,
            'protocol': proto
        }
        LOG.append(entry)
        print(entry)

def export_json(filename='packets.json'):
    with open(filename, 'w') as f:
        json.dump(LOG, f, indent=2)

def export_csv(filename='packets.csv'):
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['timestamp', 'src', 'dst', 'size', 'protocol'])
        writer.writeheader()
        writer.writerows(LOG)

if __name__ == '__main__':
    print(f'Starting packet capture on TCP/UDP port {PORT}...')
    try:
        sniff(filter=f'tcp port {PORT} or udp port {PORT}', prn=packet_callback, store=0)
    except KeyboardInterrupt:
        print('\nCapture stopped. Exporting logs...')
        export_json()
        export_csv()
        print('Logs exported to packets.json and packets.csv')
