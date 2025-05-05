KNOWN_MODELS = [
    "wolf", "banshee", "banshee gt", "banshee ss", "hawk", "elite", "albatross", "gnarwhal", "gnarwhal 2",
    "quake", "aftershock", "marvel", "triton", "accelerator", "accelerator s", "AL7", "warthog", "yeti",
    "ghost", "avalanche", "big al", "wolf", "ape", "glitch", "swirl", "tigershark", "gsquared", "proto",
    "og", "alpha", "covenant", "direwolf", "buffalo", "rhino", "pelican", "thrush", "eagle", "hawk",
    "raven", "sparrow", "swallow", "warbird", "kingfisher", "hummingbird", "falcon", "owl", "swan",
    "phoenix", "griffin", "dragon", "hydra", "kraken", "leviathan", "chimera", "basilisk", "manticore",
    "sphinx", "pegasus", "unicorn", "minotaur", "centaur", "harpy", "siren", "medusa", "cyclops",
    "titan", "atlas", "hercules", "achilles", "ares", "apollo", "artemis", "athena", "hades", "poseidon",
    "zeus", "chronos", "hyperion", "oceanus", "prometheus", "rhea", "selene", "theia", "themis",
    "council", "reaper"
]

KNOWN_COLORWAYS = [
    "aqua", "black", "blue", "bronze", "brown", "clear", "copper", "gold", "gray", "green",
    "orange", "pink", "purple", "red", "silver", "white", "yellow", "raw", "polished",
    "ano", "anodized", "fade", "splash", "swirl", "acid", "galaxy", "tie dye", "marble",
    "solid", "transparent", "opaque", "matte", "gloss", "satin", "brushed", "blasted",
    "nickel", "titanium", "brass", "aluminum", "steel", "copper", "rainbow", "oil slick",
    "two tone", "dual tone", "tri color", "multi color", "special edition", "limited edition",
    "prototype", "sample", "test", "experimental", "one off", "unique", "custom", "standard",
    "regular", "classic", "original", "new", "v2", "mk2", "2.0", "second gen", "next gen",
    "White Walker"
]

QUANTITY_PATTERNS = [
    r"(\d+)\s*available",
    r"(\d+)\s*pieces",
    r"(\d+)\s*pcs",
    r"(\d+)\s*units",
    r"quantity:\s*(\d+)",
    r"qty:\s*(\d+)",
    r"limited to\s*(\d+)",
    r"only\s*(\d+)",
    r"(\d+)\s*total",
    r"(\d+)\s*drops?",
    r"dropping\s*(\d+)",
    r"releasing\s*(\d+)",
    r"(\d+)\s*passed\s*QC",
    r"(\d+)\s*passed\s*qc"
] 