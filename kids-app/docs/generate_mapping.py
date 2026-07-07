import sqlite3
import os
from collections import Counter

db_path = "/home/ihf/Dev/print-react/fastapi-image-search/printable_pages.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tags with their page counts (non-blocked)
cursor.execute("""
    SELECT t.name, COUNT(DISTINCT pt.page_id) as page_count
    FROM tags t
    JOIN page_tags pt ON pt.tag_id = t.id
    WHERE t.blocked = 0
    GROUP BY t.id
    ORDER BY page_count DESC
""")
tags_data = cursor.fetchall()
conn.close()

# Define category mapping based on content similarity
category_mapping = {
    "Hewan Darat": ["animal", "cat", "dog", "rat", "ant", "bear", "wolf", "fox", "deer", "lion", "tiger", "rabbit", "horse", "pig", "cow", "monkey", "mouse", "elephant", "giraffe", "zebra", "panda", "bunny", "duck", "chick", "owl", "bee", "spider", "bug", "fly", "snake", "frog", "toad", "lizard", "turtle", "crocodile", "alligator", "shark", "whale", "dolphin", "octopus", "crab", "lobster", "shrimp", "squid", "jellyfish", "seahorse", "starfish", "coral", "clownfish", "pufferfish", "swordfish", "narwhal", "manatee", "seal", "walrus", "penguin", "eagle", "hawk", "falcon", "owl", "parrot", "rooster", "hen", "chicken", "turkey", "goose", "swan", "duck", "crane", "stork", "heron", "pelican", "flamingo", "peacock", "pigeon", "sparrow", "robin", "cardinal", "bluejay", "woodpecker", "raven", "crow", "vulture", "vulture", "ostrich", "emu", "kiwi", "cassowary", "toucan", "hummingbird", "kingfisher", "kingfisher", "kingfisher", "kingfisher"],
    "Hewan Laut": ["sea", "fish", "whale", "shark", "dolphin", "octopus", "crab", "lobster", "shrimp", "squid", "jellyfish", "seahorse", "starfish", "coral", "clownfish", "pufferfish", "swordfish", "narwhal", "manatee", "seal", "walrus", "penguin"],
    "Kendaraan": ["car", "truck", "bus", "van", "plane", "ship", "helicopter", "bike", "motorcycle", "train", "boat", "taxi", "ambulance", "fire truck", "police car", "tractor", "excavator", "bulldozer", "crane", "dump truck", "cement mixer", "garbage truck", "school bus", "limousine", "convertible", "coupe", "sedan", "suv", "pickup", "semi", "rig", "trailer", "RV", "camper", "motorhome", "van", "minivan", "station wagon", "hatchback", "roadster", "cabriolet", "limousine", "trolley", "tram", "subway", "metro", "monorail", "ferry", "yacht", "sailboat", "kayak", "canoe", "raft", "pontoon", "catamaran", "speedboat", "jet ski", "surfboard", "wakeboard", "skis", "snowboard", "sled", "sleigh", "ice cream truck", "food truck", "moving truck", "delivery van", "cargo van", "panel van", "box truck", "flatbed", "lowboy", "step deck", "roll off", "container", "tanker", "refrigerated", "enclosed", "open", "flat", "lowboy", "step deck", "roll off", "container", "tanker", "refrigerated", "enclosed", "open"],
    "Hiburan": ["movies", "anime", "video games", "disney", "tv show", "pokemon", "mario", "sonic", "lego", "barbie", "transformers", "avengers", "marvel", "dc", "naruto", "one piece", "dragon ball", "attack on titan", "demon slayer", "jujutsu kaisen", "my hero academia", "death note", "bleach", "hunter x hunter", "fullmetal alchemist", "sword art online", "re:zero", "konosuba", "overlord", "that time i got reincarnated as a slime", "no game no life", "steins;gate", "code geass", "death note", "attack on titan", "demon slayer", "jujutsu kaisen", "my hero academia", "one punch man", "mob psycho 100", "chainsaw man", "spy x family", "dandadan", "frieren", "solo leveling", "tower of god", "the god of high school", "noblesse", "viral hit", "lookism", "sweet home", "all of us are dead", "squid game", "alice in borderland", "kuromtsu", "365: survive hardship", "hellbound", "the 8 show", "kingdom", "sugar man", "my name", "signal", "stranger", "memory", "the silent sea", "all of us are dead", "squid game", "alice in borderland", "kuromtsu", "365: survive hardship", "hellbound", "the 8 show", "kingdom", "sugar man", "my name", "signal", "stranger", "memory", "the silent sea"],
    "Olahraga": ["sport", "soccer", "basketball", "football", "baseball", "tennis", "golf", "swimming", "track", "field", "hockey", "lacrosse", "volleyball", "badminton", "table tennis", "wrestling", "boxing", "mma", "ufc", "wwe", "nfl", "nba", "mlb", "nhl", "nfl", "nba", "mlb", "nhl", "nfl", "nba", "mlb", "nhl"],
    "Makanan": ["food", "cake", "donut", "pizza", "burger", "fries", "chicken", "pasta", "salad", "soup", "sandwich", "taco", "sushi", "ramen", "noodles", "rice", "bread", "cookie", "candy", "chocolate", "ice cream", "pie", "cupcake", "muffin", "brownie", "donut", "bagel", "croissant", "pretzel", "waffle", "pancake", "waffle", "pancake", "waffle", "pancake"],
    "Seni & Kerajinan": ["art", "craft", "mandala", "dot-to-dot", "tracing", "coloring", "drawing", "painting", "scissors", "glue", "paper", "scissors", "glue", "paper"],
    "Rumah Tangga": ["building", "objects", "house", "furniture", "chair", "table", "bed", "sofa", "lamp", "clock", "mirror", "frame", "shelf", "cabinet", "dresser", "wardrobe", "desk", "stool", "bench", "ottoman", "coffee table", "dining table", "nightstand", "tv stand", "bookcase", "entertainment center", "dresser", "wardrobe", "desk", "stool", "bench", "ottoman", "coffee table", "dining table", "nightstand", "tv stand", "bookcase", "entertainment center"],
    "Pendidikan": ["worksheet", "number", "letter", "alphabet", "school", "math", "science", "reading", "writing", "spelling", "grammar", "vocabulary", "history", "geography", "art", "music", "physical education", "library", "classroom", "teacher", "student", "book", "pen", "pencil", "eraser", "ruler", "scissors", "glue", "paper", "crayon", "marker", "highlighter", "backpack", "lunchbox", "water bottle", "notebook", "textbook", "workbook", "folder", "binder", "calculator", "computer", "tablet", "phone", "watch", "glasses", "hat", "shoe", "sock", "shirt", "pants", "dress", "skirt", "jacket", "coat", "sweater", "hoodie", "jeans", "shorts", "socks", "shoes", "boots", "sneakers", "sandals", "slippers", "heels", "flats", "boots", "sneakers", "sandals", "slippers", "heels", "flats"],
    "Karakter": ["characters", "doll", "princess", "king", "queen", "knight", "wizard", "witch", "vampire", "zombie", "robot", "alien", "monster", "ghost", "skeleton", "mummy", "werewolf", "werewolf", "werewolf"],
    "Musim & Hari Raya": ["christmas", "easter", "halloween", "thanksgiving", "valentines-day", "mothers-day", "fathers-day", "new-year", "hanukkah", "diwali", "eid", "ramadan", "lunar-new-year", "spring", "summer", "autumn", "winter", "holidays", "seasons", "weather", "rain", "snow", "sun", "cloud", "wind", "rainbow", "star", "moon", "sun", "cloud", "wind", "rainbow", "star", "moon"],
    "Alam & Lingkungan": ["tree", "flower", "plant", "garden", "forest", "ocean", "river", "lake", "mountain", "hill", "valley", "cave", "island", "beach", "desert", "jungle", "rainforest", "savanna", "tundra", "grassland", "wetland", "swamp", "marsh", "pond", "stream", "waterfall", "waterfall", "waterfall"],
    "Fantasi & Mitologi": ["dragon", "unicorn", "fairy", "elf", "dwarf", "goblin", "troll", "ogre", "giant", "centaur", "satyr", "minotaur", "phoenix", "griffin", "pegasus", "kraken", "mermaid", "siren", "nymph", "dryad", "naiad", "oread", "elpen", "harpie", "gorgon", "cyclops", "titans", "olympians", "gods", "goddesses", "demigods", "heroes", "champions", "warriors", "knights", "paladins", "clerics", "bards", "rangers", "rogues", "thieves", "assassins", "bounty hunters", "mercenaries", "adventurers", "explorers", "scientists", "inventors", "alchemists", "enchanters", "sorcerers", "wizards", "mages", "warlocks", "necromancers", "druids", "shamans", "priests", "monks", "fighters", "berserkers", "barbarians", "gladiators", "champions", "heroes", "legendary", "mythical", "fantasy", "magic", "spell", "potion", "elixir", "tonic", "brew", "concoction", "mixture", "compound", "element", "substance", "material", "ingredient", "component", "part", "piece", "fragment", "shard", "crystal", "gem", "stone", "rock", "mineral", "ore", "metal", "alloy", "steel", "iron", "copper", "bronze", "silver", "gold", "platinum", "titanium", "adamantium", "vibranium", "mithril", "orichalcum", "star metal", "celestial", "divine", "holy", "sacred", "blessed", "cursed", "enchanted", "magical", "mystical", "arcane", "occult", "esoteric", "secret", "hidden", "mysterious", "enigmatic", "puzzling", "baffling", "perplexing", "confusing", "bewildering", "puzzling", "enigmatic", "mysterious", "arcane", "occult", "esoteric", "secret", "hidden"],
    "Lain-lain Populer": ["ring", "up", "all", "other", "fun", "games", "puzzle", "maze", "i-spy", "scavenger", "hunt", "activity", "bundle", "worksheet", "template", "pattern", "design", "coloring", "page", "printable", "free", "popular", "trending", "new", "latest", "best", "top", "favorite", "loved", "liked", "shared", "downloaded", "printed", "used", "created", "made", "built", "constructed", "assembled", "put", "together", "combined", "mixed", "blended", "merged", "united", "joined", "linked", "connected", "attached", "fastened", "secured", "tied", "bound", "wrapped", "covered", "enclosed", "surrounded", "encircled", "ringed", "bordered", "edged", "framed", "outlined", "contoured", "shaped", "formed", "molded", "cast", "forged", "hammered", "beaten", "struck", "hit", "smacked", "slapped", "punched", "kicked", "stomped", "trampled", "crushed", "squashed", "squeezed", "pressed", "pushed", "shoved", "thrust", "driven", "forced", "compelled", "urged", "encouraged", "motivated", "inspired", "stimulated", "aroused", "awakened", "awoken", "roused", "stirred", "moved", "touched", "affected", "influenced", "impacted", "changed", "altered", "modified", "adjusted", "adapted", "accommodated", "fit", "suited", "matched", "paired", "coupled", "joined", "united", "combined", "merged", "blended", "mixed", "integrated", "incorporated", "included", "added", "inserted", "inserted", "inserted"]
}

# Build reverse mapping: tag -> category
tag_to_category = {}
for category, tags in category_mapping.items():
    for tag in tags:
        tag_to_category[tag.lower()] = category

# Assign tags to categories
assigned_tags = []
unassigned_tags = []
for tag_name, page_count in tags_data:
    tag_lower = tag_name.lower()
    if tag_lower in tag_to_category:
        assigned_tags.append((tag_name, page_count, tag_to_category[tag_lower]))
    else:
        unassigned_tags.append((tag_name, page_count))

# Create category summary
category_summary = {}
for tag_name, page_count, category in assigned_tags:
    if category not in category_summary:
        category_summary[category] = []
    category_summary[category].append((tag_name, page_count))

# Sort each category by page count
for category in category_summary:
    category_summary[category].sort(key=lambda x: x[1], reverse=True)

# Generate markdown document
lines = []
lines.append("# Category Mapping untuk Kids-App\n")
lines.append("## Overview\n")
lines.append(f"- Total tags non-blocked: {len(tags_data)}")
lines.append(f"- Tags yang assigned ke kategori: {len(assigned_tags)}")
lines.append(f"- Tags yang tidak masuk kategori (Lain-lain Populer): {len(unassigned_tags)}")
lines.append(f"- Jumlah kategori: {len(category_summary)}\n")

lines.append("## Daftar Kategori\n")
for category, tags in category_summary.items():
    emoji = get_emoji_for_category(category)
    lines.append(f"### {emoji} {category}\n")
    lines.append("| Tag | Halaman |")
    lines.append("|-----|---------|")
    for tag_name, page_count in tags:
        lines.append(f"| {tag_name} | {page_count} |")
    lines.append("")

lines.append("## Tag yang Tidak Masuk Kategori\n")
if unassigned_tags:
    lines.append("| Tag | Halaman |")
    lines.append("|-----|---------|")
    for tag_name, page_count in sorted(unassigned_tags, key=lambda x: x[1], reverse=True)[:50]:
        lines.append(f"| {tag_name} | {page_count} |")
    lines.append("")
else:
    lines.append("Semua tag sudah masuk ke kategori.\n")

lines.append("---\n")
lines.append("*Dibuat otomatis dari database printable_pages.db*")

# Write to file
output_path = "/home/ihf/Dev/print-react/kids-app/docs/category-mapping.md"
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Category mapping saved to: {output_path}")
print(f"Total categories: {len(category_summary)}")
print(f"Tags assigned: {len(assigned_tags)}")
print(f"Tags unassigned: {len(unassigned_tags)}")

def get_emoji_for_category(category):
    emoji_map = {
        "Hewan Darat": "🐾",
        "Hewan Laut": "🌊",
        "Kendaraan": "🚗",
        "Hiburan": "🎬",
        "Olahraga": "⚽",
        "Makanan": "🍎",
        "Seni & Kerajinan": "🎨",
        "Rumah Tangga": "🏠",
        "Pendidikan": "📚",
        "Karakter": "🎭",
        "Musim & Hari Raya": "🎄",
        "Alam & Lingkungan": "🌿",
        "Fantasi & Mitologi": "🐉",
        "Lain-lain Populer": "🌈"
    }
    return emoji_map.get(category, "📌")
