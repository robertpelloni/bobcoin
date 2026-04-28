#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct LastVotedForkSlotsRecord {
    #[prost(uint64, repeated, tag = "1")]
    pub last_voted_fork_slots: ::prost::alloc::vec::Vec<u64>,
    #[prost(string, tag = "2")]
    pub last_vote_bankhash: ::prost::alloc::string::String,
    #[prost(uint32, tag = "3")]
    pub shred_version: u32,
    #[prost(uint64, tag = "4")]
    pub wallclock: u64,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct LastVotedForkSlotsAggregateRecord {
    #[prost(map = "string, message", tag = "1")]
    pub received: ::std::collections::HashMap<
        ::prost::alloc::string::String,
        LastVotedForkSlotsRecord,
    >,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct WenRestartProgress {
    #[prost(enumeration = "State", tag = "1")]
    pub state: i32,
    #[prost(message, optional, tag = "2")]
    pub my_last_voted_fork_slots: ::core::option::Option<LastVotedForkSlotsRecord>,
    #[prost(message, optional, tag = "3")]
    pub last_voted_fork_slots_aggregate: ::core::option::Option<
        LastVotedForkSlotsAggregateRecord,
    >,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, ::prost::Enumeration)]
#[repr(i32)]
pub enum State {
    Init = 0,
    LastVotedForkSlots = 1,
    HeaviestFork = 2,
    GeneratingSnapshot = 3,
    FinishedSnapshot = 4,
    WaitingForSupermajority = 5,
    Done = 6,
}
impl State {
    /// String value of the enum field names used in the ProtoBuf definition.
    ///
    /// The values are not transformed in any way and thus are considered stable
    /// (if the ProtoBuf definition does not change) and safe for programmatic use.
    pub fn as_str_name(&self) -> &'static str {
        match self {
            State::Init => "INIT",
            State::LastVotedForkSlots => "LAST_VOTED_FORK_SLOTS",
            State::HeaviestFork => "HEAVIEST_FORK",
            State::GeneratingSnapshot => "GENERATING_SNAPSHOT",
            State::FinishedSnapshot => "FINISHED_SNAPSHOT",
            State::WaitingForSupermajority => "WAITING_FOR_SUPERMAJORITY",
            State::Done => "DONE",
        }
    }
    /// Creates an enum from field names used in the ProtoBuf definition.
    pub fn from_str_name(value: &str) -> ::core::option::Option<Self> {
        match value {
            "INIT" => Some(Self::Init),
            "LAST_VOTED_FORK_SLOTS" => Some(Self::LastVotedForkSlots),
            "HEAVIEST_FORK" => Some(Self::HeaviestFork),
            "GENERATING_SNAPSHOT" => Some(Self::GeneratingSnapshot),
            "FINISHED_SNAPSHOT" => Some(Self::FinishedSnapshot),
            "WAITING_FOR_SUPERMAJORITY" => Some(Self::WaitingForSupermajority),
            "DONE" => Some(Self::Done),
            _ => None,
        }
    }
}
