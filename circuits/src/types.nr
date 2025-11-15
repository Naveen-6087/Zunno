// Core type definitions for ZK UNO

/// Merkle tree depth (supports up to 128 leaves for 108 cards)
global MERKLE_DEPTH: u32 = 7;

/// Total number of UNO cards in the deck
global DECK_SIZE: u32 = 108;

/// Maximum number of cards a player can hold
global MAX_HAND_SIZE: u32 = 20;

/// Number of cards dealt initially per player
global INITIAL_DEAL_SIZE: u32 = 5;

/// Card color enumeration
/// 0 = Wild (colorless)
/// 1 = Red
/// 2 = Green  
/// 3 = Blue
/// 4 = Yellow
struct CardColor {
    value: u8
}

impl CardColor {
    fn wild() -> Self { CardColor { value: 0 } }
    fn red() -> Self { CardColor { value: 1 } }
    fn green() -> Self { CardColor { value: 2 } }
    fn blue() -> Self { CardColor { value: 3 } }
    fn yellow() -> Self { CardColor { value: 4 } }
    
    fn is_wild(self) -> bool { self.value == 0 }
    fn is_valid(self) -> bool { self.value <= 4 }
}

/// Card type enumeration
/// 0-9 = Number cards
/// 10 = Skip
/// 11 = Reverse
/// 12 = Draw Two
/// 13 = Wild
/// 14 = Wild Draw Four
struct CardType {
    value: u8
}

impl CardType {
    fn number(n: u8) -> Self { 
        assert(n <= 9);
        CardType { value: n } 
    }
    fn skip() -> Self { CardType { value: 10 } }
    fn reverse() -> Self { CardType { value: 11 } }
    fn draw_two() -> Self { CardType { value: 12 } }
    fn wild() -> Self { CardType { value: 13 } }
    fn wild_draw_four() -> Self { CardType { value: 14 } }
    
    fn is_wild(self) -> bool { self.value >= 13 }
    fn is_action(self) -> bool { self.value >= 10 }
    fn is_number(self) -> bool { self.value <= 9 }
    fn is_valid(self) -> bool { self.value <= 14 }
}

/// Complete card representation with unique identifier
struct Card {
    color: CardColor,
    card_type: CardType,
    copy_index: u8,  // For handling duplicates
}

impl Card {
    fn new(color: CardColor, card_type: CardType, copy_index: u8) -> Self {
        Card { color, card_type, copy_index }
    }
    
    fn is_valid(self) -> bool {
        self.color.is_valid() & self.card_type.is_valid()
    }
}

/// Card commitment - hash of card UID and nonce
struct CardCommitment {
    leaf: Field,  // Poseidon(card_uid, nonce)
}

/// Merkle proof for card inclusion
struct MerkleProof {
    path: [Field; MERKLE_DEPTH],
    indices: [u1; MERKLE_DEPTH],  // 0 = left, 1 = right
}

/// Deck state represented by Merkle root
struct DeckState {
    root: Field,
    card_count: u32,
}

/// Player hand representation (private)
struct PlayerHand {
    cards: [Field; MAX_HAND_SIZE],  // Card UIDs
    nonces: [Field; MAX_HAND_SIZE],
    count: u32,
}

/// Consumed cards bitset state
struct ConsumedState {
    root: Field,  // Commitment to bitset
    count: u32,   // Number of consumed cards
}

/// Aggregate invariants for deck integrity
struct DeckInvariants {
    sum_uid: Field,      // Sum of all card UIDs
    product_uid: Field,  // Product of all card UIDs (with offset)
    count: u32,
}

/// Game state transition
struct StateTransition {
    old_state: DeckState,
    new_state: DeckState,
    consumed_old: ConsumedState,
    consumed_new: ConsumedState,
}
