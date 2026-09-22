/**
 * Network & LAN Deployment Utility
 * Provides helpers for local network (LAN) configuration, IP detection guidance,
 * and offline server host management for Irrigator Association Record Management System.
 */

export interface NetworkHostInfo {
  serverHost: string;
  defaultPort: number;
  lanAccessUrl: string;
  isOfflineMode: boolean;
}

/**
 * Returns configuration guidance for connecting client devices over LAN / Wi-Fi
 */
export function getLanConnectionDetails(serverIp: string = '192.168.1.X', port: number = 3000): NetworkHostInfo {
  return {
    serverHost: serverIp,
    defaultPort: port,
    lanAccessUrl: `http://${serverIp}:${port}`,
    isOfflineMode: true,
  };
}

/**
 * Instructions for Server Administrator to locate host IP on Windows Command Prompt
 */
export const LAN_SERVER_INSTRUCTIONS = {
  findIpWindows: 'ipconfig | findstr /i "IPv4 Address"',
  findIpMacLinux: 'ifconfig | grep "inet " || hostname -I',
  allowFirewallWindows: 'netsh advfirewall firewall add rule name="NextJS LAN 3000" dir=in action=allow protocol=TCP localport=3000',
};
