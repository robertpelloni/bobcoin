use std::fmt;
use std::net::{IpAddr, Ipv4Addr};

// Typically MTU is 1500, so a safe UDP payload is often around 1280 or less.
pub const PACKET_DATA_SIZE: usize = 1280;

#[derive(Clone, PartialEq, Eq)]
pub struct Packet {
    pub data: [u8; PACKET_DATA_SIZE],
    pub meta: Meta,
}

impl Default for Packet {
    fn default() -> Self {
        Self {
            data: [0u8; PACKET_DATA_SIZE],
            meta: Meta::default(),
        }
    }
}

impl fmt::Debug for Packet {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Packet {{ size: {}, meta: {:?} }}",
            self.meta.size, self.meta
        )
    }
}

impl Packet {
    pub fn new(data: &[u8], meta: Meta) -> Self {
        let mut packet = Packet::default();
        let len = std::cmp::min(data.len(), PACKET_DATA_SIZE);
        packet.data[..len].copy_from_slice(&data[..len]);
        packet.meta = meta;
        packet.meta.size = len;
        packet
    }
}

#[derive(Clone, PartialEq, Eq)]
pub struct Meta {
    pub size: usize,
    pub addr: IpAddr,
    pub port: u16,
    pub flags: PacketFlags,
}

impl Default for Meta {
    fn default() -> Self {
        Self {
            size: 0,
            addr: IpAddr::V4(Ipv4Addr::UNSPECIFIED),
            port: 0,
            flags: PacketFlags::empty(),
        }
    }
}

impl fmt::Debug for Meta {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Meta")
            .field("size", &self.size)
            .field("addr", &self.addr)
            .field("port", &self.port)
            .field("flags", &self.flags)
            .finish()
    }
}

bitflags::bitflags! {
    #[derive(Default, Clone, Copy, Debug, PartialEq, Eq)]
    pub struct PacketFlags: u8 {
        const FORWARDED = 0b0000_0001;
        const REPAIRED  = 0b0000_0010;
        const DISCARD   = 0b0000_0100;
    }
}
