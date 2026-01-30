const fs = require('fs');

// New categories to add
const newCategories = {
  jewelry: [
    'amulet', 'bangle', 'beads', 'bling', 'cameo', 'chain', 'choker',
    'circlet', 'clasp', 'crown', 'diamond', 'emerald', 'gem', 'gemstone',
    'gold', 'jade', 'jewel', 'opal', 'pearl', 'ruby', 'sapphire', 'silver',
    'stud', 'topaz', 'turquoise'
  ],
  toy: [
    'action', 'balloon', 'blocks', 'brick', 'card', 'checkers', 'chess',
    'crayon', 'dice', 'doll', 'domino', 'frisbee', 'hula', 'jacks',
    'kite', 'lego', 'marble', 'model', 'monopoly', 'playdough', 'puppet',
    'puzzle', 'rattle', 'robot', 'scooter', 'seesaw', 'slinky', 'slide',
    'soldier', 'swing', 'teddy', 'top', 'train', 'tricycle', 'wagon', 'yoyo'
  ],
  weapon: [
    'ammo', 'armor', 'arrow', 'axe', 'bayonet', 'blade', 'bomb', 'bow',
    'bullet', 'cannon', 'catapult', 'club', 'crossbow', 'dagger', 'dart',
    'dynamite', 'firearm', 'flail', 'grenade', 'gun', 'halberd', 'harpoon',
    'helmet', 'holster', 'lance', 'machete', 'mace', 'mine', 'missile',
    'mortar', 'musket', 'pistol', 'quiver', 'rapier', 'revolver', 'rifle',
    'saber', 'scabbard', 'sheath', 'shield', 'shotgun', 'sling', 'spear',
    'staff', 'sword', 'torpedo', 'trident', 'whip'
  ],
  document: [
    'affidavit', 'agenda', 'application', 'article', 'ballot', 'bill',
    'blueprint', 'brochure', 'bulletin', 'catalog', 'charter', 'citation',
    'claim', 'clause', 'contract', 'coupon', 'deed', 'diploma', 'draft',
    'fax', 'file', 'flyer', 'folder', 'form', 'gazette', 'handbook',
    'invoice', 'journal', 'leaflet', 'ledger', 'letter', 'license',
    'log', 'magazine', 'manifest', 'manual', 'map', 'memo', 'menu',
    'newsletter', 'notice', 'pamphlet', 'passport', 'permit', 'petition',
    'placard', 'policy', 'poster', 'prescription', 'prospectus', 'receipt',
    'record', 'reference', 'registry', 'report', 'resume', 'roster',
    'schedule', 'script', 'scroll', 'statement', 'stub', 'summons',
    'survey', 'tab', 'table', 'tally', 'tariff', 'template', 'testimony',
    'ticket', 'title', 'transcript', 'treaty', 'voucher', 'warrant',
    'will', 'writ'
  ],
  grammar: [
    'adjective', 'adverb', 'clause', 'colon', 'comma', 'conjunction',
    'consonant', 'contraction', 'dash', 'ellipsis', 'exclamation',
    'gerund', 'hyphen', 'infinitive', 'interjection', 'metaphor',
    'modifier', 'noun', 'object', 'paragraph', 'parenthesis', 'participle',
    'period', 'phrase', 'plural', 'predicate', 'prefix', 'preposition',
    'pronoun', 'punctuation', 'question', 'quotation', 'semicolon',
    'sentence', 'simile', 'singular', 'subject', 'suffix', 'syllable',
    'syntax', 'tense', 'verb', 'vowel', 'word'
  ],
  quantity: [
    'abundance', 'all', 'amount', 'any', 'batch', 'bit', 'both', 'bulk',
    'bunch', 'chunk', 'clump', 'couple', 'dose', 'double', 'each', 'enough',
    'every', 'excess', 'extra', 'few', 'fraction', 'half', 'heap', 'horde',
    'host', 'lack', 'least', 'less', 'load', 'lot', 'many', 'mass', 'maximum',
    'minimum', 'more', 'most', 'much', 'multiple', 'none', 'pack', 'pair',
    'part', 'piece', 'pile', 'pinch', 'plenty', 'portion', 'quad', 'quota',
    'ration', 'remainder', 'rest', 'scarcity', 'several', 'share', 'shortage',
    'slice', 'sliver', 'some', 'spare', 'stack', 'stock', 'sum', 'supply',
    'surplus', 'ton', 'total', 'trace', 'trio', 'unit', 'variety', 'whole'
  ],
  position: [
    'above', 'across', 'adjacent', 'after', 'against', 'ahead', 'along',
    'amid', 'among', 'apart', 'around', 'aside', 'atop', 'back', 'before',
    'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'bottom',
    'center', 'close', 'corner', 'diagonal', 'distant', 'down', 'east',
    'edge', 'end', 'exterior', 'far', 'fore', 'forward', 'front', 'here',
    'horizontal', 'inner', 'inside', 'interior', 'left', 'lower', 'middle',
    'near', 'north', 'opposite', 'outer', 'outside', 'over', 'parallel',
    'perpendicular', 'rear', 'right', 'side', 'south', 'there', 'through',
    'top', 'under', 'up', 'upper', 'vertical', 'west', 'within', 'without'
  ],
  medical: [
    'ache', 'ailment', 'allergy', 'ambulance', 'anesthesia', 'antibiotic',
    'aspirin', 'autopsy', 'bandage', 'biopsy', 'blister', 'blood', 'bone',
    'bruise', 'bypass', 'capsule', 'cast', 'checkup', 'clinic', 'clot',
    'concussion', 'condition', 'crutch', 'cure', 'diagnosis', 'dialysis',
    'disease', 'disorder', 'dosage', 'emergency', 'epidemic', 'fever',
    'flu', 'fracture', 'germ', 'headache', 'healing', 'hospital', 'illness',
    'immunity', 'implant', 'infection', 'infirmary', 'injection', 'injury',
    'inoculation', 'insulin', 'intensive', 'lab', 'lesion', 'malady',
    'medication', 'medicine', 'mri', 'nausea', 'needle', 'nurse', 'operation',
    'organ', 'outpatient', 'pain', 'pandemic', 'paramedic', 'patient',
    'pharmacy', 'physician', 'pill', 'plague', 'plasma', 'poison', 'pulse',
    'quarantine', 'rash', 'recovery', 'remedy', 'scan', 'scalpel', 'scar',
    'screening', 'sedative', 'serum', 'sickness', 'specialist', 'specimen',
    'sprain', 'sterilize', 'stethoscope', 'stitches', 'strain', 'stress',
    'surgeon', 'surgery', 'swelling', 'symptom', 'syndrome', 'syringe',
    'tablet', 'therapy', 'thermometer', 'tissue', 'tonic', 'toxin',
    'transplant', 'trauma', 'treatment', 'tumor', 'ultrasound', 'vaccine',
    'vein', 'virus', 'vitamin', 'ward', 'wheelchair', 'wound', 'xray'
  ],
  legal: [
    'acquittal', 'affidavit', 'alibi', 'allegation', 'amendment', 'appeal',
    'arbitration', 'arraignment', 'arrest', 'attorney', 'bail', 'bench',
    'brief', 'case', 'charge', 'civil', 'client', 'confession', 'contempt',
    'conviction', 'counsel', 'court', 'criminal', 'custody', 'damages',
    'decree', 'defendant', 'defense', 'deposition', 'dispute', 'docket',
    'evidence', 'exhibit', 'felony', 'fine', 'fraud', 'gavel', 'guilty',
    'habeas', 'hearing', 'homicide', 'immunity', 'indictment', 'injunction',
    'innocent', 'jail', 'judge', 'judgment', 'jurisdiction', 'juror',
    'jury', 'justice', 'lawsuit', 'lawyer', 'legalese', 'legislation',
    'liability', 'litigation', 'manslaughter', 'mediation', 'misdemeanor',
    'mistrial', 'motion', 'murder', 'oath', 'objection', 'offense',
    'ordinance', 'parole', 'perjury', 'plaintiff', 'plea', 'precedent',
    'prison', 'probation', 'prosecution', 'prosecutor', 'retrial', 'ruling',
    'sanction', 'settlement', 'sheriff', 'statute', 'subpoena', 'suit',
    'summons', 'suspect', 'testimony', 'theft', 'trial', 'tribunal',
    'verdict', 'violation', 'warrant', 'witness'
  ],
  military: [
    'admiral', 'aircraft', 'airforce', 'ammunition', 'armada', 'armory',
    'army', 'arsenal', 'artillery', 'barracks', 'base', 'battalion',
    'battlefield', 'battleship', 'blockade', 'boot', 'brigade', 'bunker',
    'cadet', 'camouflage', 'camp', 'campaign', 'captain', 'carrier',
    'cavalry', 'civilian', 'colonel', 'combat', 'command', 'commander',
    'commando', 'company', 'conflict', 'conscript', 'convoy', 'corps',
    'corporal', 'cruiser', 'decree', 'defense', 'deployment', 'destroyer',
    'division', 'draft', 'drill', 'duty', 'enemy', 'enlist', 'fleet',
    'forces', 'fort', 'fortress', 'frontline', 'garrison', 'general',
    'grenade', 'guard', 'guerrilla', 'headquarters', 'infantry', 'intel',
    'invasion', 'jet', 'lieutenant', 'major', 'maneuver', 'march', 'marine',
    'medal', 'militia', 'mission', 'navy', 'officer', 'outpost', 'parade',
    'patrol', 'platoon', 'private', 'radar', 'raid', 'rank', 'recruit',
    'regiment', 'reserve', 'retreat', 'sailor', 'salute', 'scout',
    'sergeant', 'service', 'siege', 'sniper', 'soldier', 'sortie',
    'squadron', 'strategy', 'submarine', 'tactics', 'tank', 'target',
    'tour', 'trench', 'troop', 'uniform', 'unit', 'veteran', 'warfare',
    'warrior', 'weapons'
  ],
  bird: [
    'albatross', 'blackbird', 'bluebird', 'budgie', 'canary', 'cardinal',
    'chickadee', 'cockatiel', 'cockatoo', 'condor', 'cormorant', 'crane',
    'crow', 'cuckoo', 'dove', 'duck', 'eagle', 'egret', 'falcon', 'finch',
    'flamingo', 'goose', 'grouse', 'gull', 'hawk', 'heron', 'hummingbird',
    'ibis', 'jay', 'kestrel', 'kingfisher', 'kiwi', 'lark', 'loon',
    'macaw', 'magpie', 'mallard', 'mockingbird', 'nightingale', 'oriole',
    'osprey', 'ostrich', 'owl', 'parakeet', 'parrot', 'partridge', 'peacock',
    'pelican', 'penguin', 'pheasant', 'pigeon', 'plover', 'puffin', 'quail',
    'raven', 'roadrunner', 'robin', 'rooster', 'sandpiper', 'seagull',
    'sparrow', 'starling', 'stork', 'swallow', 'swan', 'swift', 'tern',
    'thrush', 'toucan', 'turkey', 'vulture', 'warbler', 'wren', 'woodpecker'
  ],
  fish: [
    'anchovy', 'barracuda', 'bass', 'betta', 'carp', 'catfish', 'char',
    'clownfish', 'cod', 'crappie', 'eel', 'flounder', 'goldfish', 'grouper',
    'guppy', 'haddock', 'halibut', 'herring', 'koi', 'mackerel', 'mahi',
    'marlin', 'minnow', 'mullet', 'perch', 'pike', 'piranha', 'plaice',
    'pollock', 'ray', 'salmon', 'sardine', 'shark', 'snapper', 'sole',
    'sturgeon', 'sunfish', 'swordfish', 'tilapia', 'trout', 'tuna', 'walleye',
    'whiting'
  ],
  insect: [
    'ant', 'aphid', 'bee', 'beetle', 'bug', 'bumblebee', 'butterfly',
    'caterpillar', 'centipede', 'cicada', 'cockroach', 'cricket', 'dragonfly',
    'earwig', 'firefly', 'flea', 'fly', 'gnat', 'grasshopper', 'grub',
    'hornet', 'katydid', 'ladybug', 'larva', 'locust', 'louse', 'maggot',
    'mantis', 'mayfly', 'midge', 'millipede', 'mite', 'mosquito', 'moth',
    'nymph', 'roach', 'silverfish', 'slug', 'snail', 'spider', 'stinkbug',
    'termite', 'tick', 'wasp', 'weevil', 'worm'
  ],
  reptile: [
    'adder', 'alligator', 'anaconda', 'asp', 'boa', 'chameleon', 'cobra',
    'copperhead', 'coral', 'cottonmouth', 'crocodile', 'gecko', 'gila',
    'iguana', 'komodo', 'lizard', 'mamba', 'monitor', 'python', 'rattlesnake',
    'salamander', 'serpent', 'skink', 'snake', 'terrapin', 'tortoise',
    'turtle', 'viper'
  ],
  mammal: [
    'aardvark', 'alpaca', 'anteater', 'antelope', 'ape', 'armadillo',
    'baboon', 'badger', 'bat', 'bear', 'beaver', 'bison', 'boar', 'bobcat',
    'buffalo', 'bull', 'camel', 'caribou', 'cat', 'cheetah', 'chimpanzee',
    'chipmunk', 'cougar', 'cow', 'coyote', 'deer', 'dingo', 'dog', 'dolphin',
    'donkey', 'elephant', 'elk', 'ferret', 'fox', 'gazelle', 'gerbil',
    'giraffe', 'goat', 'gorilla', 'hamster', 'hare', 'hedgehog', 'hippo',
    'horse', 'hyena', 'jaguar', 'kangaroo', 'koala', 'lemur', 'leopard',
    'lion', 'llama', 'lynx', 'manatee', 'meerkat', 'mink', 'mole', 'mongoose',
    'monkey', 'moose', 'mouse', 'mule', 'narwhal', 'ocelot', 'opossum',
    'orangutan', 'orca', 'otter', 'ox', 'panda', 'panther', 'pig', 'platypus',
    'pony', 'porcupine', 'porpoise', 'possum', 'puma', 'rabbit', 'raccoon',
    'ram', 'rat', 'reindeer', 'rhino', 'seal', 'sheep', 'shrew', 'skunk',
    'sloth', 'squirrel', 'stallion', 'tapir', 'tiger', 'walrus', 'warthog',
    'weasel', 'whale', 'wolf', 'wolverine', 'wombat', 'yak', 'zebra'
  ]
};

// Words to add to existing categories
const additions = {
  drink: [
    'ale', 'bourbon', 'brew', 'coke', 'daiquiri', 'espresso', 'grog',
    'latte', 'liquor', 'mead', 'mocha', 'nectar', 'punch', 'sangria',
    'scotch', 'slush', 'spirit', 'spritzer', 'tequila', 'toddy'
  ],
  food: [
    'bacon', 'bagel', 'biscuit', 'bread', 'broth', 'butter', 'cereal',
    'cheese', 'chip', 'chop', 'cracker', 'cream', 'crust', 'curry',
    'dip', 'dough', 'dumpling', 'egg', 'fillet', 'flour', 'gravy',
    'grits', 'hash', 'honey', 'jam', 'jelly', 'jerky', 'loaf', 'margarine',
    'mayo', 'noodle', 'oat', 'oatmeal', 'omelet', 'pancake', 'pasta',
    'patty', 'peanut', 'pickle', 'porridge', 'pretzel', 'rice', 'roll',
    'salad', 'salt', 'sandwich', 'sauce', 'sausage', 'seasoning', 'soup',
    'steak', 'stew', 'stock', 'stuffing', 'sugar', 'syrup', 'taco',
    'toast', 'tofu', 'tortilla', 'waffle', 'wheat', 'yogurt'
  ],
  furniture: [
    'armchair', 'armoire', 'bassinet', 'beanbag', 'bench', 'bookcase',
    'bunk', 'bureau', 'cabinet', 'canopy', 'chair', 'chaise', 'chest',
    'closet', 'couch', 'cot', 'cradle', 'credenza', 'crib', 'cushion',
    'daybed', 'desk', 'divan', 'dresser', 'footstool', 'futon', 'hammock',
    'headboard', 'hutch', 'loveseat', 'mattress', 'nightstand', 'ottoman',
    'recliner', 'rocker', 'sectional', 'settee', 'shelf', 'sideboard',
    'sofa', 'stool', 'table', 'throne', 'vanity', 'wardrobe'
  ],
  vehicle: [
    'airplane', 'ambulance', 'atv', 'bike', 'boat', 'blimp', 'buggy',
    'bus', 'cab', 'camper', 'canoe', 'car', 'carriage', 'cart', 'chopper',
    'convertible', 'coupe', 'cruiser', 'cycle', 'ferry', 'firetruck',
    'glider', 'gondola', 'helicopter', 'hovercraft', 'jeep', 'jet', 'kayak',
    'limousine', 'locomotive', 'metro', 'minivan', 'moped', 'motorcycle',
    'pickup', 'plane', 'raft', 'rickshaw', 'rocket', 'rv', 'sailboat',
    'scooter', 'sedan', 'ship', 'shuttle', 'sled', 'sleigh', 'speedboat',
    'streetcar', 'submarine', 'subway', 'suv', 'tanker', 'taxi', 'tractor',
    'trailer', 'train', 'tram', 'trolley', 'truck', 'tugboat', 'van',
    'wagon', 'yacht', 'zeppelin'
  ],
  tool: [
    'anvil', 'awl', 'axe', 'blade', 'bolt', 'broom', 'brush', 'bucket',
    'chisel', 'clamp', 'crowbar', 'cutter', 'drill', 'file', 'fork',
    'funnel', 'hammer', 'hatchet', 'hoe', 'hook', 'jack', 'jigsaw',
    'ladder', 'lathe', 'lever', 'mallet', 'mop', 'nail', 'needle', 'nut',
    'paint', 'peg', 'pickaxe', 'pin', 'pliers', 'plunger', 'pulley',
    'pump', 'rake', 'razor', 'rivet', 'ruler', 'sandpaper', 'saw',
    'scaffold', 'screw', 'screwdriver', 'shears', 'shovel', 'sickle',
    'sledgehammer', 'socket', 'spade', 'spatula', 'spike', 'staple',
    'tape', 'tongs', 'torch', 'trowel', 'vise', 'washer', 'wedge',
    'wheel', 'wire', 'wrench'
  ],
  building: [
    'apartment', 'arcade', 'arena', 'armory', 'auditorium', 'bakery',
    'bank', 'bar', 'barn', 'basilica', 'brewery', 'bungalow', 'bunker',
    'cabin', 'cafe', 'casino', 'castle', 'cathedral', 'chapel', 'church',
    'cinema', 'clinic', 'club', 'college', 'condo', 'cottage', 'courthouse',
    'deli', 'depot', 'diner', 'dome', 'dorm', 'duplex', 'factory', 'farm',
    'firehouse', 'fort', 'foundry', 'gallery', 'garage', 'gazebo', 'gym',
    'hall', 'hangar', 'hospital', 'hostel', 'hotel', 'house', 'hut', 'igloo',
    'inn', 'jail', 'kiosk', 'lab', 'library', 'lighthouse', 'lodge', 'loft',
    'mall', 'mansion', 'market', 'mill', 'motel', 'mosque', 'museum',
    'nursery', 'office', 'outpost', 'palace', 'parlor', 'pavilion', 'pharmacy',
    'pier', 'plant', 'plaza', 'post', 'prison', 'pub', 'pyramid', 'ranch',
    'refinery', 'restaurant', 'rink', 'salon', 'school', 'shed', 'shelter',
    'shop', 'shrine', 'silo', 'skyscraper', 'spa', 'stable', 'stadium',
    'station', 'store', 'studio', 'synagogue', 'tavern', 'temple', 'tent',
    'terminal', 'theater', 'tower', 'university', 'villa', 'warehouse',
    'windmill', 'winery', 'zoo'
  ],
  clothing: [
    'apron', 'belt', 'blazer', 'blouse', 'boot', 'boxer', 'bra', 'cap',
    'cape', 'cardigan', 'cloak', 'coat', 'collar', 'costume', 'dress',
    'gown', 'hat', 'hood', 'jacket', 'jeans', 'jersey', 'jumpsuit', 'kilt',
    'kimono', 'leggings', 'lingerie', 'mitten', 'overalls', 'pajamas',
    'pants', 'parka', 'poncho', 'robe', 'sandal', 'scarf', 'shirt', 'shoe',
    'shorts', 'skirt', 'sleeve', 'slipper', 'sneaker', 'sock', 'suit',
    'sweater', 'swimsuit', 'tie', 'tights', 'toga', 'trousers', 'tunic',
    'tuxedo', 'underwear', 'uniform', 'vest', 'wetsuit'
  ],
  sport: [
    'archery', 'badminton', 'baseball', 'basketball', 'biking', 'billiards',
    'bowling', 'boxing', 'climbing', 'cricket', 'croquet', 'curling',
    'cycling', 'darts', 'diving', 'fencing', 'fishing', 'football', 'golf',
    'gymnastics', 'handball', 'hiking', 'hockey', 'hunting', 'judo',
    'karate', 'kayaking', 'kickboxing', 'lacrosse', 'marathon', 'polo',
    'racing', 'rafting', 'rowing', 'rugby', 'running', 'sailing', 'skating',
    'skiing', 'skydiving', 'snorkeling', 'snowboarding', 'soccer', 'softball',
    'sprinting', 'squash', 'surfing', 'swimming', 'tennis', 'track',
    'triathlon', 'volleyball', 'walking', 'wrestling', 'yoga'
  ],
  emotion: [
    'admiration', 'affection', 'agony', 'amazement', 'anger', 'anguish',
    'annoyance', 'anticipation', 'anxiety', 'apathy', 'awe', 'bliss',
    'boredom', 'calm', 'compassion', 'confidence', 'confusion', 'contempt',
    'contentment', 'courage', 'curiosity', 'defeat', 'delight', 'depression',
    'desire', 'despair', 'disappointment', 'disgust', 'distress', 'doubt',
    'dread', 'ecstasy', 'embarrassment', 'empathy', 'enthusiasm', 'envy',
    'euphoria', 'excitement', 'exhilaration', 'fascination', 'fear', 'fright',
    'frustration', 'fury', 'glee', 'gratitude', 'grief', 'guilt', 'happiness',
    'hatred', 'hope', 'horror', 'hostility', 'humiliation', 'hurt',
    'indifference', 'inspiration', 'interest', 'irritation', 'isolation',
    'jealousy', 'joy', 'loneliness', 'longing', 'love', 'lust', 'melancholy',
    'misery', 'nervousness', 'nostalgia', 'optimism', 'outrage', 'pain',
    'panic', 'passion', 'peace', 'pessimism', 'pity', 'pleasure', 'pride',
    'rage', 'regret', 'rejection', 'relief', 'remorse', 'resentment',
    'sadness', 'satisfaction', 'scorn', 'serenity', 'shame', 'shock',
    'sorrow', 'spite', 'suffering', 'surprise', 'suspense', 'sympathy',
    'tenderness', 'terror', 'thrill', 'torment', 'tranquility', 'triumph',
    'trust', 'unease', 'woe', 'wonder', 'worry', 'wrath', 'yearning', 'zeal'
  ],
  number: [
    'billion', 'decimal', 'digit', 'dozen', 'eight', 'eighteen', 'eighty',
    'eleven', 'fifteen', 'fifty', 'five', 'forty', 'four', 'fourteen',
    'fraction', 'googol', 'gross', 'half', 'hundred', 'million', 'nine',
    'nineteen', 'ninety', 'one', 'percent', 'quadrillion', 'quarter', 'score',
    'seven', 'seventeen', 'seventy', 'six', 'sixteen', 'sixty', 'ten',
    'third', 'thirteen', 'thirty', 'thousand', 'three', 'trillion', 'twelve',
    'twenty', 'two', 'zero'
  ],
  shape: [
    'arc', 'arrow', 'circle', 'cone', 'crescent', 'cross', 'cube', 'curve',
    'cylinder', 'diamond', 'disc', 'ellipse', 'heart', 'helix', 'hexagon',
    'line', 'loop', 'octagon', 'oval', 'parallelogram', 'pentagon', 'point',
    'polygon', 'prism', 'pyramid', 'rectangle', 'rhombus', 'ring', 'sphere',
    'spiral', 'square', 'star', 'trapezoid', 'triangle', 'wedge', 'zigzag'
  ]
};

// Read current file
let content = fs.readFileSync('shared/dictionary/categories.ts', 'utf8');

// Find the closing of _categoryWords object (before the transform line)
const closingMatch = content.match(/(\n\};\n\n\/\/ Transform)/);
if (!closingMatch) {
  console.error('Could not find end of _categoryWords');
  process.exit(1);
}

// Build new categories string
let newCategoriesStr = '';
for (const [key, words] of Object.entries(newCategories)) {
  const sortedWords = [...new Set(words)].sort();
  newCategoriesStr += '  ' + key + ': [\n';
  for (const word of sortedWords) {
    newCategoriesStr += '    "' + word.toLowerCase() + '",\n';
  }
  newCategoriesStr += '  ],\n';
}

// Insert new categories before the closing
content = content.replace(/(\n\};\n\n\/\/ Transform)/, '\n' + newCategoriesStr + '$1');

// Add words to existing categories
for (const [category, words] of Object.entries(additions)) {
  const categoryRegex = new RegExp(`(  ${category}: \\[\\n)([\\s\\S]*?)(\\n  \\],)`);
  const match = content.match(categoryRegex);

  if (match) {
    // Get existing words
    const existingContent = match[2];
    const existingWords = existingContent.match(/"([^"]+)"/g)?.map(w => w.replace(/"/g, '')) || [];

    // Combine and dedupe
    const allWords = [...new Set([...existingWords, ...words.map(w => w.toLowerCase())])].sort();

    // Build new content
    let newContent = '';
    for (const word of allWords) {
      newContent += '    "' + word + '",\n';
    }

    content = content.replace(categoryRegex, '$1' + newContent + '  ],');
    console.log(`Updated ${category}: ${existingWords.length} -> ${allWords.length} words`);
  } else {
    console.log(`Warning: Could not find category "${category}"`);
  }
}

// Write updated file
fs.writeFileSync('shared/dictionary/categories.ts', content);

// Count results
const categoryCount = (content.match(/^  [a-zA-Z]+:/gm) || []).length;
const wordCount = (content.match(/"[a-z]+"/g) || []).length;
console.log(`\nTotal categories: ${categoryCount}`);
console.log(`Total words: ~${wordCount}`);
console.log('\nNew categories added:', Object.keys(newCategories).join(', '));
