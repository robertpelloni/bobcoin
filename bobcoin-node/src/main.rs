use std::env;

const VERSION: &str = include_str!("../../VERSION.md");

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] == "--version" {
        println!("Bobcoin Node v{}", VERSION.trim());
        return;
    }
    println!("Bobcoin Node starting...");
}
fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] == "--version" {
        println!("Bobcoin Node v{}", VERSION.trim());
        return;
    }
    println!("Bobcoin Node starting...");
}

    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && args[1] == "--version" {
        println!("Bobcoin Node v{}", VERSION.trim());
        return;
    }
    println!("Bobcoin Node starting...");
}

