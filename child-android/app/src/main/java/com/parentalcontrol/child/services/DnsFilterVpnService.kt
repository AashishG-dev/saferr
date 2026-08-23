package com.parentalcontrol.child.services

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import com.parentalcontrol.child.network.ChildSocketManager
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

class DnsFilterVpnService : VpnService() {

    companion object {
        private const val TAG = "DnsFilterVpn"
        private const val VPN_DNS = "1.1.1.1"
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private val executor = Executors.newFixedThreadPool(2)
    private var isRunning = false
    private val blockedDomains = ConcurrentHashMap.newKeySet<String>()

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "DnsFilterVpnService created.")

        // Seed initial blocked domains
        blockedDomains.addAll(listOf("tiktok.com", "omegle.com", "roblox.com", "pornhub.com", "casino.com"))

        // Listen for policy updates
        ChildSocketManager.getInstance(this).onPolicyUpdated = { json ->
            val webFilter = json.optJSONObject("webFilter")
            if (webFilter != null) {
                val blockedArray = webFilter.optJSONArray("blockedDomains")
                blockedDomains.clear()
                if (blockedArray != null) {
                    for (i in 0 until blockedArray.length()) {
                        blockedDomains.add(blockedArray.getString(i).lowercase())
                    }
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isRunning) {
            startVpn()
        }
        return START_STICKY
    }

    private fun startVpn() {
        try {
            val builder = Builder()
                .setSession("Child Web Protection Filter")
                .addAddress("10.0.0.2", 32)
                .addDnsServer(VPN_DNS)
                .addRoute(VPN_DNS, 32) // Only route DNS packets through VPN TUN

            vpnInterface = builder.establish()
            isRunning = true

            vpnInterface?.let { pfd ->
                executor.execute { runVpnLoop(pfd) }
            }

            Log.i(TAG, "Safe Web VPN Filter established successfully.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start VPN interface", e)
        }
    }

    private fun runVpnLoop(pfd: ParcelFileDescriptor) {
        val inputStream = FileInputStream(pfd.fileDescriptor)
        val outputStream = FileOutputStream(pfd.fileDescriptor)
        val packet = ByteBuffer.allocate(32767)

        while (isRunning) {
            try {
                val length = inputStream.read(packet.array())
                if (length > 0) {
                    packet.limit(length)
                    handleIpPacket(packet, outputStream)
                    packet.clear()
                }
            } catch (e: Exception) {
                if (!isRunning) break
                Log.w(TAG, "VPN Loop read error: ${e.message}")
            }
        }
    }

    private fun handleIpPacket(packet: ByteBuffer, vpnOutput: FileOutputStream) {
        val buffer = packet.array()
        val length = packet.limit()

        // Check if IPv4 and UDP
        val version = (buffer[0].toInt() shr 4) and 0x0F
        if (version != 4) return

        val protocol = buffer[9].toInt() and 0xFF
        if (protocol != 17) return // 17 = UDP

        val headerLength = (buffer[0].toInt() and 0x0F) * 4
        val destPort = ((buffer[headerLength + 2].toInt() and 0xFF) shl 8) or (buffer[headerLength + 3].toInt() and 0xFF)

        if (destPort == 53) {
            // DNS Request
            val dnsOffset = headerLength + 8
            val domain = extractDomainName(buffer, dnsOffset, length)
            
            if (domain != null) {
                Log.d(TAG, "DNS Query intercepted: $domain")
                if (isDomainBlocked(domain)) {
                    Log.w(TAG, "🚫 Blocked domain access attempt: $domain")
                    ChildSocketManager.getInstance(this).sendAlert(
                        "BLOCKED_SITE_ATTEMPT",
                        "Attempted access to blocked site: $domain",
                        "medium"
                    )
                    // Drop packet or reply with 0.0.0.0 sinkhole
                    return
                }
            }

            // Forward allowed DNS packet upstream
            forwardDnsUpstream(buffer, length, vpnOutput)
        }
    }

    private fun extractDomainName(buffer: ByteArray, offset: Int, length: Int): String? {
        try {
            var curr = offset + 12 // skip DNS header
            val sb = StringBuilder()
            while (curr < length) {
                val labelLen = buffer[curr].toInt() and 0xFF
                if (labelLen == 0) break
                curr++
                if (curr + labelLen > length) break
                for (i in 0 until labelLen) {
                    sb.append(buffer[curr + i].toInt().toChar())
                }
                sb.append('.')
                curr += labelLen
            }
            return sb.toString().trimEnd('.').lowercase()
        } catch (e: Exception) {
            return null
        }
    }

    private fun isDomainBlocked(domain: String): Boolean {
        for (blocked in blockedDomains) {
            if (domain == blocked || domain.endsWith(".$blocked")) {
                return true
            }
        }
        return false
    }

    private fun forwardDnsUpstream(packetData: ByteArray, length: Int, vpnOutput: FileOutputStream) {
        try {
            val udpPayloadOffset = ((packetData[0].toInt() and 0x0F) * 4) + 8
            val dnsPayloadLen = length - udpPayloadOffset
            val dnsPayload = packetData.copyOfRange(udpPayloadOffset, length)

            val socket = DatagramSocket()
            protect(socket) // Bypass VPN loop
            val upstreamAddress = InetAddress.getByName(VPN_DNS)
            val outPacket = DatagramPacket(dnsPayload, dnsPayloadLen, upstreamAddress, 53)
            socket.send(outPacket)

            // Receive response
            val respBuffer = ByteArray(1024)
            val inPacket = DatagramPacket(respBuffer, respBuffer.size)
            socket.soTimeout = 2000
            socket.receive(inPacket)
            socket.close()

            // In full implementation, repackage into IP packet and write to vpnOutput
        } catch (e: Exception) {
            // timeout or network issue
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        try {
            vpnInterface?.close()
            vpnInterface = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing VPN", e)
        }
    }
}
