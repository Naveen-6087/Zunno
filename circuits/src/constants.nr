// Game constants for ZK UNO

use crate::types::{DECK_SIZE, MERKLE_DEPTH};

/// Total number of each card type in standard UNO deck
/// - Each color (Red, Green, Blue, Yellow) has:
///   - One 0
///   - Two each of 1-9  
///   - Two each of Skip, Reverse, Draw Two
/// - Wild cards:
///   - Four Wild
///   - Four Wild Draw Four

global CARDS_PER_COLOR: u32 = 25;
global WILD_CARD_COUNT: u32 = 8;

/// Color codes
global COLOR_WILD: u8 = 0;
global COLOR_RED: u8 = 1;
global COLOR_GREEN: u8 = 2;
global COLOR_BLUE: u8 = 3;
global COLOR_YELLOW: u8 = 4;

/// Card type codes
global TYPE_ZERO: u8 = 0;
global TYPE_SKIP: u8 = 10;
global TYPE_REVERSE: u8 = 11;
global TYPE_DRAW_TWO: u8 = 12;
global TYPE_WILD: u8 = 13;
global TYPE_WILD_DRAW_FOUR: u8 = 14;

/// Field arithmetic constants
global FIELD_OFFSET: Field = 100;  // Offset for product calculations to avoid zero

/// Bitset compression chunk size
global BITSET_CHUNK_SIZE: u32 = 16;

/// Maximum players in a game
global MAX_PLAYERS: u32 = 6;

/// Poseidon domain separation tags
global DOMAIN_CARD_UID: Field = 1;
global DOMAIN_CARD_COMMITMENT: Field = 2;
global DOMAIN_MERKLE_NODE: Field = 3;
global DOMAIN_BITSET_COMPRESS: Field = 4;

/// Standard UNO deck composition (for reference and testing)
/// Returns the count of each card type for a given color
/// Color 0 (Wild): Only Wild (4) and Wild Draw Four (4)
/// Colors 1-4 (Red/Green/Blue/Yellow): 
///   - Type 0: 1 copy
///   - Types 1-9: 2 copies each
///   - Types 10-12 (Skip/Reverse/Draw2): 2 copies each
fn get_card_count(color: u8, card_type: u8) -> u8 {
    if color == COLOR_WILD {
        if card_type == TYPE_WILD { 4 }
        else if card_type == TYPE_WILD_DRAW_FOUR { 4 }
        else { 0 }
    } else if color >= COLOR_RED & color <= COLOR_YELLOW {
        if card_type == TYPE_ZERO { 1 }
        else if card_type <= 9 { 2 }
        else if card_type >= TYPE_SKIP & card_type <= TYPE_DRAW_TWO { 2 }
        else { 0 }
    } else {
        0
    }
}

/// Verify deck composition is correct
pub fn verify_deck_composition(card_counts: [[u8; 15]; 5]) -> bool {
    let mut valid = true;
    
    for color in 0..5 {
        for card_type in 0..15 {
            let expected = get_card_count(color as u8, card_type as u8);
            if card_counts[color][card_type] != expected {
                valid = false;
            }
        }
    }
    
    valid
}
