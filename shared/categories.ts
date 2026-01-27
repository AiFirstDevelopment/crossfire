// Word categories for hint system
// Words are mapped to simple, recognizable categories

const categoryWords: Record<string, string[]> = {
  // Nature
  fruit: [
    'apple', 'banana', 'orange', 'grape', 'lemon', 'lime', 'mango', 'peach', 'pear', 'plum',
    'cherry', 'berry', 'melon', 'kiwi', 'fig', 'date', 'olive', 'coconut', 'papaya', 'guava',
    'apricot', 'avocado', 'tomato', 'watermelon', 'cantaloupe', 'honeydew', 'pomegranate',
    'raspberry', 'blueberry', 'strawberry', 'blackberry', 'cranberry', 'grapefruit', 'tangerine',
    'nectarine', 'persimmon', 'dragonfruit', 'passionfruit', 'starfruit', 'lychee', 'raisin',

    // additions
    'pineapple', 'granny', 'plantain', 'kumquat', 'yuzu', 'pomelo', 'clementine', 'satsuma',
    'bloodorange', 'mandarin', 'quince', 'jackfruit', 'durian', 'rambutan', 'longan', 'mangosteen',
    'cherimoya', 'soursop', 'feijoa', 'tamarind', 'currant', 'gooseberry', 'boysenberry',
    'mulberry', 'elderberry', 'lingonberry', 'cloudberry', 'huckleberry', 'acai', 'breadfruit',
    'prune',
  ],
  vegetable: [
    'carrot', 'potato', 'onion', 'garlic', 'celery', 'lettuce', 'spinach', 'kale', 'broccoli',
    'cabbage', 'corn', 'pea', 'bean', 'beet', 'turnip', 'radish', 'squash', 'zucchini',
    'cucumber', 'pepper', 'eggplant', 'asparagus', 'artichoke', 'cauliflower', 'mushroom',
    'leek', 'shallot', 'parsley', 'basil', 'mint', 'oregano', 'thyme', 'rosemary', 'sage',
    'cilantro', 'dill', 'chive', 'ginger', 'yam', 'pumpkin', 'okra', 'chard', 'arugula',

    // additions
    'brussels', 'sprouts', 'bokchoy', 'collard', 'endive', 'escarole', 'romaine', 'iceberg',
    'radicchio', 'watercress', 'cress', 'mustardgreens', 'microgreens', 'fennel', 'parsnip',
    'rutabaga', 'jicama', 'kohlrabi', 'celeriac', 'daikon', 'scallion', 'greenonion',
    'sweetpotato', 'chili', 'jalapeno', 'habanero', 'serrano', 'poblano', 'bellpepper',
    'tomatillo', 'greenbean', 'edamame', 'lentil', 'splitpea', 'chickpea',
    'broccolini', 'romanesco', 'bambooshoot', 'waterchestnut', 'cassava', 'taro',
  ],
  animal: [
    'dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken',
    'duck', 'turkey', 'rabbit', 'mouse', 'rat', 'hamster', 'guinea', 'ferret', 'snake',
    'lizard', 'turtle', 'frog', 'toad', 'salamander', 'crocodile', 'alligator', 'shark',
    'whale', 'dolphin', 'seal', 'walrus', 'otter', 'beaver', 'bear', 'wolf', 'fox',
    'deer', 'moose', 'elk', 'buffalo', 'bison', 'zebra', 'giraffe', 'elephant', 'rhino',
    'hippo', 'lion', 'tiger', 'leopard', 'cheetah', 'jaguar', 'panther', 'cougar', 'puma',
    'monkey', 'ape', 'gorilla', 'chimp', 'orangutan', 'baboon', 'lemur', 'kangaroo', 'koala',
    'bat', 'owl', 'eagle', 'hawk', 'falcon', 'vulture', 'crow', 'raven', 'sparrow', 'robin',
    'cardinal', 'bluejay', 'finch', 'canary', 'parrot', 'macaw', 'cockatoo', 'penguin',
    'flamingo', 'pelican', 'seagull', 'heron', 'crane', 'stork', 'swan', 'goose', 'pigeon',
    'dove', 'peacock', 'ostrich', 'emu', 'hummingbird', 'woodpecker', 'toucan', 'puffin',
    'ant', 'bee', 'wasp', 'hornet', 'fly', 'mosquito', 'butterfly', 'moth', 'beetle',
    'ladybug', 'firefly', 'dragonfly', 'grasshopper', 'cricket', 'locust', 'mantis', 'roach',
    'spider', 'scorpion', 'centipede', 'millipede', 'worm', 'snail', 'slug', 'clam', 'oyster',
    'mussel', 'lobster', 'crab', 'shrimp', 'prawn', 'octopus', 'squid', 'jellyfish', 'starfish',
    'salmon', 'trout', 'bass', 'tuna', 'cod', 'herring', 'mackerel', 'sardine', 'anchovy',
    'catfish', 'goldfish', 'guppy', 'betta', 'piranha', 'barracuda', 'swordfish', 'marlin',
    'stingray', 'manta', 'eel', 'seahorse', 'porcupine', 'hedgehog', 'skunk', 'raccoon',
    'possum', 'armadillo', 'sloth', 'anteater', 'meerkat', 'mongoose', 'hyena', 'jackal',
    'coyote', 'dingo', 'mole', 'shrew', 'vole', 'squirrel', 'chipmunk', 'gopher', 'prairie',
    'llama', 'alpaca', 'camel', 'donkey', 'mule', 'pony', 'stallion', 'mare', 'foal', 'colt',
    'puppy', 'kitten', 'cub', 'pup', 'calf', 'lamb', 'kid', 'piglet', 'chick', 'duckling',
    'fawn', 'joey', 'tadpole', 'hatchling', 'fledgling',

    // additions
    'reindeer', 'antelope', 'gazelle', 'ibex', 'warthog', 'boar', 'badger', 'marten', 'weasel',
    'stoat', 'ermine', 'wolverine', 'lynx', 'bobcat', 'ocelot', 'caracal', 'serval',
    'capybara', 'tapir', 'manatee', 'dugong', 'narwhal', 'orca', 'beluga', 'porpoise',
    'lemur', 'macaque', 'gibbon',
    'gecko', 'iguana', 'chameleon', 'komodo', 'python', 'cobra', 'viper', 'boa',
    'newt', 'axolotl',
    'sealion', 'furseal',
    'albatross', 'kestrel', 'condor', 'ibis', 'kingfisher', 'loon', 'puffin', 'wren',
    'woodlouse', 'tick', 'mite', 'flea', 'termite', 'cicada',
    'coral', 'anemone', 'urchin', 'barnacle',
  ],
  plant: [
    'tree', 'flower', 'grass', 'bush', 'shrub', 'vine', 'fern', 'moss', 'algae', 'cactus',
    'palm', 'pine', 'oak', 'maple', 'birch', 'willow', 'cedar', 'spruce', 'fir', 'redwood',
    'sequoia', 'bamboo', 'rose', 'tulip', 'daisy', 'lily', 'orchid', 'sunflower', 'violet',
    'pansy', 'petunia', 'marigold', 'carnation', 'chrysanthemum', 'daffodil', 'hyacinth',
    'iris', 'jasmine', 'lavender', 'lilac', 'magnolia', 'peony', 'poppy', 'zinnia', 'clover',
    'dandelion', 'thistle', 'ivy', 'holly', 'mistletoe', 'poinsettia', 'hibiscus', 'gardenia',
    'azalea', 'rhododendron', 'camellia', 'bougainvillea', 'wisteria', 'honeysuckle', 'lotus',
    'seaweed', 'kelp', 'reed', 'cattail', 'seed', 'root', 'stem', 'leaf', 'branch',
    'twig', 'bark', 'trunk', 'petal', 'pollen', 'nectar', 'bud', 'bloom', 'blossom', 'sprout',

    // additions
    'mushroom', 'lichen', 'fungus', 'mycelium',
    'acorn', 'cone', 'sap', 'resin', 'stamen', 'pistil', 'ovary', 'stigma',
    'succulent', 'aloe', 'agave', 'yucca',
    'eucalyptus', 'juniper', 'cypress', 'poplar', 'aspen', 'elm', 'ash', 'sycamore', 'walnut',
    'chestnut', 'pecan', 'hazel', 'dogwood', 'magnolia',
    'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint', 'cilantro', 'dill', 'parsley',
    'bamboo', 'briar', 'bramble', 'hedge', 'hedgerow',
  ],
  weather: [
    'rain', 'snow', 'hail', 'sleet', 'fog', 'mist', 'cloud', 'storm', 'thunder', 'lightning',
    'wind', 'breeze', 'gust', 'gale', 'hurricane', 'tornado', 'cyclone', 'typhoon', 'monsoon',
    'drought', 'flood', 'frost', 'ice', 'dew', 'humidity', 'sunshine', 'rainbow', 'blizzard',
    'avalanche', 'tsunami', 'earthquake', 'tremor', 'volcano', 'eruption', 'mudslide',

    // additions
    'drizzle', 'downpour', 'sprinkle', 'shower', 'squall', 'thunderstorm', 'hailstorm',
    'heatwave', 'coldfront', 'warmfront', 'front', 'pressure', 'barometer',
    'smog', 'haze', 'overcast', 'sunny', 'clear', 'partlycloudy',
    'blackice', 'whiteout', 'windchill',
    'aftershock', 'landslide', 'rockslide', 'sinkhole',
    'wildfire', 'smoke', 'ashfall',
  ],

  // Body
  'body part': [
    'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'lip', 'tongue', 'tooth', 'teeth',
    'chin', 'cheek', 'jaw', 'forehead', 'brow', 'eyebrow', 'eyelash', 'eyelid', 'pupil',
    'neck', 'throat', 'shoulder', 'arm', 'elbow', 'wrist', 'hand', 'palm', 'finger', 'thumb',
    'nail', 'knuckle', 'fist', 'chest', 'breast', 'rib', 'stomach', 'belly', 'navel', 'waist',
    'hip', 'back', 'spine', 'pelvis', 'buttock', 'leg', 'thigh', 'knee', 'calf', 'shin',
    'ankle', 'foot', 'heel', 'toe', 'sole', 'arch', 'skin', 'hair', 'scalp', 'beard',
    'mustache', 'brain', 'heart', 'lung', 'liver', 'kidney', 'intestine', 'bladder', 'muscle',
    'bone', 'joint', 'tendon', 'ligament', 'cartilage', 'vein', 'artery', 'nerve', 'skull',

    // additions
    'temple', 'nostril', 'gum', 'palate', 'uvula', 'tonsil', 'larynx', 'trachea', 'esophagus',
    'shoulderblade', 'collarbone', 'bicep', 'tricep', 'forearm',
    'womb', 'uterus', 'ovary', 'prostate', 'testicle',
    'appendix', 'colon', 'rectum', 'pancreas', 'spleen', 'gallbladder',
    'retina', 'cornea', 'iris', 'optic', 'pupil',
  ],

  // Objects
  tool: [
    'hammer', 'screwdriver', 'wrench', 'pliers', 'saw', 'drill', 'chisel', 'file', 'rasp',
    'clamp', 'vice', 'level', 'ruler', 'tape', 'square', 'compass', 'protractor', 'knife',
    'scissors', 'shears', 'axe', 'hatchet', 'machete', 'shovel', 'spade', 'rake', 'hoe',
    'pitchfork', 'trowel', 'pruner', 'mower', 'trimmer', 'blower', 'chainsaw', 'sander',
    'grinder', 'welder', 'torch', 'soldering', 'multimeter', 'voltmeter', 'caliper',
    'micrometer', 'gauge', 'jack', 'crowbar', 'prybar', 'mallet', 'sledgehammer', 'pickaxe',

    // additions
    'socket', 'ratchet', 'torquewrench', 'allen', 'hexkey', 'torx', 'bit', 'driverbit',
    'studfinder', 'wirestripper', 'crimper', 'heatgun', 'gluegun',
    'visegrip', 'handsaw', 'jigsaw', 'circularsaw', 'tablesaw', 'bandsaw',
    'tapset', 'dieset', 'fileset', 'sandpaper', 'paintbrush', 'roller', 'puttyknife',
    'ladder', 'wheelbarrow',
  ],
  vehicle: [
    'car', 'truck', 'van', 'bus', 'taxi', 'limo', 'jeep', 'suv', 'sedan', 'coupe', 'wagon',
    'hatchback', 'convertible', 'roadster', 'sports', 'muscle', 'pickup', 'semi', 'trailer',
    'tanker', 'ambulance', 'firetruck', 'police', 'motorcycle', 'scooter', 'moped', 'bicycle',
    'bike', 'trike', 'tricycle', 'unicycle', 'skateboard', 'rollerblade', 'segway', 'hoverboard',
    'cart', 'wagon', 'sled', 'sleigh', 'carriage', 'buggy', 'stroller', 'wheelchair', 'scooter',
    'train', 'subway', 'metro', 'tram', 'trolley', 'monorail', 'locomotive', 'caboose', 'freight',
    'passenger', 'airplane', 'plane', 'jet', 'helicopter', 'chopper', 'drone', 'glider',
    'blimp', 'zeppelin', 'balloon', 'rocket', 'spacecraft', 'shuttle', 'satellite', 'boat',
    'ship', 'yacht', 'sailboat', 'canoe', 'kayak', 'raft', 'rowboat', 'motorboat', 'speedboat',
    'ferry', 'cruise', 'tanker', 'freighter', 'cargo', 'submarine', 'hovercraft',

    // additions
    'atv', 'utv', 'snowmobile', 'jetski', 'seaplane', 'hangglider', 'paraglider',
    'forklift', 'bulldozer', 'excavator', 'backhoe', 'dumptruck', 'cementmixer',
    'streetcar', 'lightrail',
    'spaceship', 'lander', 'capsule',
  ],
  furniture: [
    'chair', 'table', 'desk', 'sofa', 'couch', 'loveseat', 'recliner', 'ottoman', 'bench',
    'stool', 'bed', 'mattress', 'pillow', 'blanket', 'sheet', 'comforter', 'duvet', 'quilt',
    'dresser', 'drawer', 'wardrobe', 'closet', 'armoire', 'cabinet', 'shelf', 'bookcase',
    'nightstand', 'headboard', 'footboard', 'frame', 'futon', 'hammock', 'crib', 'cradle',
    'bunk', 'canopy', 'mirror', 'lamp', 'chandelier', 'sconce', 'fixture', 'rug', 'carpet',
    'curtain', 'drape', 'blind', 'shade', 'valance', 'cushion', 'throw', 'tapestry',

    // additions
    'sideboard', 'buffet', 'console', 'vanity', 'coffee', 'endtable', 'nighttable',
    'bookshelf', 'coatstand', 'umbrella', 'rack', 'shoe', 'cabinet',
    'beanbag', 'daybed', 'trundle', 'sectional',
  ],
  clothing: [
    'shirt', 'blouse', 'top', 'tank', 'tee', 'polo', 'sweater', 'cardigan', 'hoodie',
    'jacket', 'coat', 'blazer', 'vest', 'suit', 'tuxedo', 'dress', 'gown', 'skirt', 'pants',
    'jeans', 'shorts', 'capri', 'leggings', 'tights', 'stockings', 'socks', 'underwear',
    'boxers', 'briefs', 'bra', 'panties', 'slip', 'robe', 'pajamas', 'nightgown', 'swimsuit',
    'bikini', 'trunks', 'wetsuit', 'hat', 'cap', 'beanie', 'beret', 'fedora', 'bowler',
    'helmet', 'hood', 'scarf', 'shawl', 'tie', 'bowtie', 'belt', 'suspenders', 'gloves',
    'mittens', 'shoes', 'boots', 'sneakers', 'sandals', 'slippers', 'heels', 'flats',
    'loafers', 'oxfords', 'moccasins', 'flip', 'cleats', 'skates', 'uniform', 'costume',
    'apron', 'overalls', 'jumpsuit', 'romper', 'onesie', 'tunic', 'kimono', 'poncho', 'cape',

    // additions
    'raincoat', 'parka', 'windbreaker', 'anorak', 'peacoat',
    'turtleneck', 'buttondown', 'henley', 'camisole', 'bodysuit',
    'sweatpants', 'joggers', 'cargo', 'chinos', 'slacks',
    'beltbag', 'purse', 'handbag', 'backpack',
    'bracelet', 'necklace', 'ring', 'earring', 'watch',
  ],
  food: [
    'bread', 'toast', 'bagel', 'muffin', 'croissant', 'biscuit', 'roll', 'bun', 'loaf',
    'cake', 'pie', 'cookie', 'brownie', 'donut', 'pastry', 'tart', 'cupcake', 'pudding',
    'custard', 'mousse', 'ice', 'cream', 'yogurt', 'cheese', 'butter', 'milk', 'egg',
    'bacon', 'sausage', 'ham', 'steak', 'roast', 'chop', 'ribs', 'burger', 'hotdog',
    'sandwich', 'wrap', 'burrito', 'taco', 'nacho', 'quesadilla', 'enchilada', 'fajita',
    'pizza', 'pasta', 'spaghetti', 'lasagna', 'ravioli', 'macaroni', 'noodle', 'rice',
    'risotto', 'pilaf', 'soup', 'stew', 'chili', 'curry', 'salad', 'coleslaw', 'fries',
    'chips', 'pretzel', 'popcorn', 'cracker', 'cereal', 'oatmeal', 'granola', 'pancake',
    'waffle', 'crepe', 'omelet', 'quiche', 'casserole', 'potpie', 'meatloaf', 'meatball',
    'nugget', 'wing', 'drumstick', 'breast', 'thigh', 'fillet', 'seafood', 'sushi', 'sashimi',
    'roll', 'tempura', 'teriyaki', 'ramen', 'pho', 'dumpling', 'spring', 'wonton', 'tofu',
    'hummus', 'falafel', 'pita', 'flatbread', 'naan', 'tortilla', 'tostada', 'tamale',
    'empanada', 'pierogi', 'gnocchi', 'polenta', 'couscous', 'quinoa', 'lentil', 'chickpea',

    // additions
    'steak', 'brisket', 'jerky', 'meat', 'chicken', 'turkey', 'duck', 'lamb', 'venison',
    'salmon', 'shrimp', 'crab', 'lobster', 'clam', 'oyster', 'mussel',
    'sauce', 'gravy', 'salsa', 'guacamole', 'ketchup', 'mustard', 'mayo', 'aioli',
    'pickle', 'relish', 'kimchi', 'sauerkraut',
    'brownrice', 'whiterice', 'barley', 'farro', 'bulgur',
    'pesto', 'marinara', 'alfredo', 'soy', 'miso', 'broth', 'stock',
    'cheddar', 'mozzarella', 'parmesan', 'feta', 'goatcheese', 'creamcheese',
    'applepie', 'cheesecake', 'icecream', 'sorbet',
  ],
  drink: [
    'water', 'juice', 'soda', 'pop', 'cola', 'lemonade', 'tea', 'coffee', 'espresso',
    'latte', 'cappuccino', 'mocha', 'americano', 'macchiato', 'cocoa', 'chocolate', 'milk',
    'shake', 'smoothie', 'slush', 'punch', 'cider', 'beer', 'wine', 'champagne', 'vodka',
    'whiskey', 'bourbon', 'scotch', 'rum', 'gin', 'tequila', 'brandy', 'cognac', 'liqueur',
    'cocktail', 'martini', 'margarita', 'daiquiri', 'mojito', 'sangria', 'spritzer',

    // additions
    'seltzer', 'sparkling', 'club', 'tonic', 'kombucha', 'kefir', 'matcha',
    'chai', 'herbal', 'decaf', 'coldbrew', 'icedcoffee', 'icedtea',
    'protein', 'electrolyte', 'broth', 'stock',
  ],

  // Materials
  material: [
    'wood', 'metal', 'steel', 'iron', 'aluminum', 'copper', 'brass', 'bronze', 'gold',
    'silver', 'platinum', 'tin', 'zinc', 'lead', 'nickel', 'chrome', 'titanium', 'tungsten',
    'glass', 'crystal', 'ceramic', 'porcelain', 'clay', 'brick', 'concrete', 'cement',
    'stone', 'rock', 'granite', 'marble', 'slate', 'limestone', 'sandstone', 'gravel',
    'sand', 'dirt', 'soil', 'mud', 'clay', 'plastic', 'rubber', 'vinyl', 'nylon', 'polyester',
    'acrylic', 'fiberglass', 'carbon', 'leather', 'suede', 'fur', 'wool', 'cotton', 'silk',
    'linen', 'velvet', 'satin', 'denim', 'canvas', 'burlap', 'felt', 'fleece', 'tweed',
    'cashmere', 'mohair', 'angora', 'paper', 'cardboard', 'foam', 'wax', 'resin', 'epoxy',

    // additions
    'granite', 'quartz', 'obsidian', 'basalt', 'pumice',
    'asphalt', 'tar', 'bitumen',
    'silicone', 'neoprene', 'kevlar', 'graphene',
    'bamboo', 'rattan', 'cork',
  ],
  color: [
    'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'pink', 'brown', 'black',
    'white', 'gray', 'grey', 'silver', 'gold', 'bronze', 'copper', 'beige', 'tan', 'cream',
    'ivory', 'maroon', 'burgundy', 'crimson', 'scarlet', 'coral', 'salmon', 'peach', 'apricot',
    'amber', 'mustard', 'lemon', 'lime', 'olive', 'teal', 'turquoise', 'aqua', 'cyan', 'navy',
    'indigo', 'lavender', 'lilac', 'magenta', 'fuchsia', 'rose', 'mauve', 'plum', 'eggplant',
    'charcoal', 'slate', 'ash', 'pearl', 'champagne', 'khaki', 'taupe', 'mocha', 'chocolate',

    // additions
    'chartreuse', 'cerulean', 'cobalt', 'sapphire', 'emerald', 'jade', 'mint', 'seafoam',
    'periwinkle', 'ultramarine', 'vermilion', 'ochre', 'sepia', 'umber', 'sienna',
    'pastel', 'neon',
  ],

  // Places
  building: [
    'house', 'home', 'apartment', 'condo', 'townhouse', 'mansion', 'cottage', 'cabin',
    'bungalow', 'villa', 'castle', 'palace', 'fortress', 'tower', 'skyscraper', 'highrise',
    'office', 'factory', 'warehouse', 'barn', 'shed', 'garage', 'carport', 'hangar',
    'church', 'cathedral', 'chapel', 'temple', 'mosque', 'synagogue', 'monastery', 'convent',
    'school', 'university', 'college', 'academy', 'institute', 'library', 'museum', 'gallery',
    'theater', 'cinema', 'stadium', 'arena', 'gymnasium', 'auditorium', 'concert', 'hall',
    'hospital', 'clinic', 'pharmacy', 'laboratory', 'prison', 'jail', 'courthouse', 'station',
    'airport', 'terminal', 'port', 'dock', 'pier', 'wharf', 'marina', 'lighthouse', 'bridge',
    'tunnel', 'dam', 'mill', 'windmill', 'silo', 'greenhouse', 'observatory', 'planetarium',
    'aquarium', 'zoo', 'park', 'garden', 'playground', 'fountain', 'monument', 'memorial',
    'hotel', 'motel', 'inn', 'lodge', 'resort', 'hostel', 'dormitory', 'barracks', 'tent',
    'cabin', 'hut', 'shack', 'shelter', 'bunker', 'vault', 'cellar', 'basement', 'attic',

    // additions
    'mall', 'supermarket', 'grocery', 'bakery', 'butcher', 'restaurant', 'cafe', 'diner',
    'bar', 'pub', 'shop', 'store', 'market',
    'embassy', 'consulate', 'capitol', 'cityhall',
    'powerplant', 'substation', 'waterplant', 'refinery',
  ],
  room: [
    'kitchen', 'bathroom', 'bedroom', 'living', 'dining', 'den', 'study', 'office', 'nursery',
    'playroom', 'laundry', 'mudroom', 'pantry', 'closet', 'hallway', 'foyer', 'lobby',
    'vestibule', 'corridor', 'stairway', 'landing', 'balcony', 'patio', 'deck', 'porch',
    'veranda', 'terrace', 'sunroom', 'conservatory', 'attic', 'basement', 'cellar', 'garage',
    'workshop', 'studio', 'gallery', 'theater', 'gym', 'sauna', 'spa', 'pool', 'court',

    // additions
    'bath', 'shower', 'powder', 'guestroom', 'master', 'suite',
    'closet', 'walkin', 'utility', 'boiler', 'serverroom',
  ],
  place: [
    'city', 'town', 'village', 'suburb', 'neighborhood', 'district', 'county', 'state',
    'province', 'region', 'country', 'nation', 'continent', 'island', 'peninsula', 'coast',
    'beach', 'shore', 'bay', 'gulf', 'harbor', 'port', 'ocean', 'sea', 'lake', 'pond',
    'river', 'stream', 'creek', 'brook', 'waterfall', 'rapids', 'delta', 'marsh', 'swamp',
    'wetland', 'bog', 'fen', 'moor', 'prairie', 'plain', 'meadow', 'field', 'pasture',
    'farmland', 'orchard', 'vineyard', 'forest', 'woods', 'jungle', 'rainforest', 'grove',
    'thicket', 'clearing', 'glade', 'mountain', 'hill', 'valley', 'canyon', 'gorge', 'ravine',
    'cliff', 'bluff', 'plateau', 'mesa', 'butte', 'ridge', 'peak', 'summit', 'slope',
    'desert', 'dune', 'oasis', 'tundra', 'glacier', 'iceberg', 'cave', 'cavern', 'grotto',

    // additions
    'reef', 'lagoon', 'strait', 'channel', 'fjord', 'inlet', 'estuary',
    'volcano', 'crater', 'caldera',
    'steppe', 'savanna', 'badlands',
  ],

  // Activities
  sport: [
    'baseball', 'basketball', 'football', 'soccer', 'hockey', 'tennis', 'golf', 'volleyball',
    'badminton', 'squash', 'racquetball', 'ping', 'pong', 'bowling', 'billiards', 'pool',
    'darts', 'archery', 'fencing', 'boxing', 'wrestling', 'judo', 'karate', 'taekwondo',
    'kung', 'aikido', 'kendo', 'sumo', 'mma', 'ufc', 'gymnastics', 'tumbling', 'diving',
    'swimming', 'surfing', 'sailing', 'rowing', 'kayaking', 'canoeing', 'rafting', 'skiing',
    'snowboarding', 'skating', 'hockey', 'curling', 'bobsled', 'luge', 'skeleton', 'biathlon',
    'triathlon', 'decathlon', 'marathon', 'sprint', 'relay', 'hurdles', 'javelin', 'discus',
    'shotput', 'hammer', 'pole', 'vault', 'high', 'long', 'triple', 'jump', 'running',
    'jogging', 'walking', 'hiking', 'climbing', 'bouldering', 'rappelling', 'camping',
    'fishing', 'hunting', 'shooting', 'riding', 'racing', 'cycling', 'biking', 'motocross',
    'skateboarding', 'rollerblading', 'parkour', 'yoga', 'pilates', 'aerobics', 'crossfit',

    // additions
    'lacrosse', 'rugby', 'cricket', 'handball', 'pickleball', 'tabletennis',
    'powerlifting', 'weightlifting', 'bodybuilding',
    'kickboxing', 'muaythai', 'bjj',
  ],
  music: [
    'piano', 'keyboard', 'organ', 'synthesizer', 'guitar', 'bass', 'ukulele', 'banjo',
    'mandolin', 'violin', 'viola', 'cello', 'bass', 'harp', 'lyre', 'zither', 'dulcimer',
    'drum', 'snare', 'bass', 'cymbal', 'tambourine', 'triangle', 'xylophone', 'marimba',
    'vibraphone', 'glockenspiel', 'chime', 'bell', 'gong', 'bongo', 'conga', 'djembe',
    'timpani', 'flute', 'piccolo', 'recorder', 'clarinet', 'oboe', 'bassoon', 'saxophone',
    'trumpet', 'trombone', 'tuba', 'horn', 'cornet', 'bugle', 'harmonica', 'accordion',
    'bagpipe', 'didgeridoo', 'ocarina', 'pan', 'sitar', 'tabla', 'kalimba', 'theremin',
    'song', 'melody', 'harmony', 'rhythm', 'beat', 'tempo', 'chord', 'note', 'scale',
    'key', 'pitch', 'tone', 'octave', 'verse', 'chorus', 'bridge', 'intro', 'outro',
    'solo', 'duet', 'trio', 'quartet', 'ensemble', 'orchestra', 'band', 'choir', 'chorus',

    // additions
    'metronome', 'tuner', 'amplifier', 'amp', 'speaker', 'mixer', 'mic', 'microphone',
    'genre', 'jazz', 'blues', 'rock', 'pop', 'classical', 'country', 'hiphop', 'rap', 'edm',
    'folk', 'metal', 'punk', 'reggae', 'gospel',
  ],
  game: [
    'chess', 'checkers', 'backgammon', 'dominoes', 'mahjong', 'poker', 'blackjack', 'roulette',
    'craps', 'baccarat', 'bridge', 'hearts', 'spades', 'solitaire', 'uno', 'monopoly',
    'scrabble', 'trivial', 'clue', 'risk', 'catan', 'ticket', 'pandemic', 'codenames',
    'charades', 'pictionary', 'taboo', 'catchphrase', 'bingo', 'lottery', 'slots', 'arcade',
    'pinball', 'pacman', 'tetris', 'mario', 'zelda', 'pokemon', 'minecraft', 'fortnite',

    // additions
    'sudoku', 'crossword', 'wordle', 'minesweeper', 'chutes', 'ladders', 'sorry', 'trouble',
    'go', 'othello', 'yahtzee', 'battleship',
  ],

  // Concepts
  emotion: [
    'happy', 'sad', 'angry', 'mad', 'furious', 'rage', 'fear', 'scared', 'afraid', 'terrified',
    'anxious', 'nervous', 'worried', 'stressed', 'calm', 'relaxed', 'peaceful', 'serene',
    'joy', 'delight', 'elation', 'euphoria', 'ecstasy', 'bliss', 'contentment', 'satisfaction',
    'pride', 'confidence', 'hope', 'optimism', 'excitement', 'enthusiasm', 'passion', 'love',
    'affection', 'fondness', 'adoration', 'devotion', 'lust', 'desire', 'longing', 'yearning',
    'grief', 'sorrow', 'despair', 'depression', 'melancholy', 'gloom', 'misery', 'anguish',
    'guilt', 'shame', 'embarrassment', 'humiliation', 'regret', 'remorse', 'envy', 'jealousy',
    'disgust', 'contempt', 'hatred', 'loathing', 'resentment', 'bitterness', 'frustration',
    'annoyance', 'irritation', 'impatience', 'boredom', 'apathy', 'indifference', 'confusion',
    'surprise', 'shock', 'amazement', 'wonder', 'awe', 'curiosity', 'interest', 'fascination',

    // additions
    'gratitude', 'relief', 'anticipation', 'homesick', 'lonely', 'compassion', 'empathy',
    'proud', 'ashamed', 'hopeful', 'hopeless',
  ],
  time: [
    'second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century', 'millennium',
    'morning', 'noon', 'afternoon', 'evening', 'night', 'midnight', 'dawn', 'dusk', 'twilight',
    'sunrise', 'sunset', 'today', 'tomorrow', 'yesterday', 'weekend', 'weekday', 'holiday',
    'birthday', 'anniversary', 'spring', 'summer', 'autumn', 'fall', 'winter', 'season',
    'past', 'present', 'future', 'history', 'ancient', 'modern', 'era', 'epoch', 'age',
    'period', 'phase', 'cycle', 'rhythm', 'tempo', 'pace', 'moment', 'instant', 'eternity',

    // additions
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ],
  shape: [
    'circle', 'square', 'triangle', 'rectangle', 'oval', 'ellipse', 'diamond', 'rhombus',
    'pentagon', 'hexagon', 'heptagon', 'octagon', 'polygon', 'star', 'heart', 'crescent',
    'cross', 'arrow', 'spiral', 'helix', 'sphere', 'cube', 'cylinder', 'cone', 'pyramid',
    'prism', 'torus', 'dome', 'arch', 'curve', 'angle', 'line', 'point', 'vertex', 'edge',
    'face', 'surface', 'plane', 'dimension', 'symmetry', 'pattern', 'grid', 'lattice', 'mesh',

    // additions
    'parallelogram', 'trapezoid', 'kite', 'tetrahedron', 'icosahedron', 'dodecahedron',
  ],
  number: [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
    'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
    'hundred', 'thousand', 'million', 'billion', 'trillion', 'dozen', 'score', 'pair', 'triple',
    'quadruple', 'quintuple', 'half', 'third', 'quarter', 'fifth', 'sixth', 'seventh', 'eighth',
    'ninth', 'tenth', 'fraction', 'decimal', 'percent', 'ratio', 'proportion', 'average', 'sum',

    // additions
    'negative', 'positive', 'integer', 'prime', 'even', 'odd', 'multiple', 'factor',
    'numerator', 'denominator',
  ],

  // People & Jobs
  job: [
    'doctor', 'nurse', 'surgeon', 'dentist', 'pharmacist', 'therapist', 'psychologist',
    'psychiatrist', 'veterinarian', 'paramedic', 'lawyer', 'attorney', 'judge', 'prosecutor',
    'defender', 'paralegal', 'notary', 'teacher', 'professor', 'tutor', 'principal', 'dean',
    'librarian', 'counselor', 'coach', 'trainer', 'engineer', 'architect', 'designer',
    'developer', 'programmer', 'analyst', 'scientist', 'researcher', 'chemist', 'physicist',
    'biologist', 'geologist', 'astronomer', 'mathematician', 'statistician', 'economist',
    'accountant', 'auditor', 'banker', 'broker', 'trader', 'investor', 'consultant', 'manager',
    'director', 'executive', 'ceo', 'president', 'chairman', 'supervisor', 'coordinator',
    'administrator', 'secretary', 'receptionist', 'clerk', 'cashier', 'teller', 'salesperson',
    'marketer', 'advertiser', 'publicist', 'journalist', 'reporter', 'editor', 'writer',
    'author', 'poet', 'novelist', 'playwright', 'screenwriter', 'artist', 'painter', 'sculptor',
    'illustrator', 'photographer', 'filmmaker', 'director', 'producer', 'actor', 'actress',
    'performer', 'singer', 'musician', 'composer', 'conductor', 'dancer', 'choreographer',
    'chef', 'cook', 'baker', 'butcher', 'waiter', 'waitress', 'bartender', 'barista', 'sommelier',
    'farmer', 'rancher', 'gardener', 'landscaper', 'florist', 'builder', 'contractor', 'carpenter',
    'plumber', 'electrician', 'mechanic', 'technician', 'welder', 'machinist', 'pilot', 'captain',
    'sailor', 'driver', 'chauffeur', 'conductor', 'dispatcher', 'firefighter', 'police', 'detective',
    'officer', 'guard', 'soldier', 'general', 'admiral', 'colonel', 'sergeant', 'private',
    'astronaut', 'diver', 'lifeguard', 'ranger', 'warden', 'inspector', 'investigator', 'agent',

    // additions
    'cashier', 'cashier', 'barber', 'stylist', 'tailor', 'seamstress', 'optometrist',
    'radiologist', 'labtech', 'phlebotomist', 'midwife',
    'electrician', 'hvac', 'roofer', 'painter', 'mason',
    'translator', 'interpreter', 'editor', 'copywriter', 'blogger',
    'productmanager', 'projectmanager', 'scrummaster',
  ],
  family: [
    'mother', 'father', 'mom', 'dad', 'parent', 'son', 'daughter', 'child', 'kid', 'baby',
    'infant', 'toddler', 'teen', 'teenager', 'adult', 'elder', 'senior', 'brother', 'sister',
    'sibling', 'twin', 'triplet', 'grandmother', 'grandfather', 'grandma', 'grandpa', 'grandparent',
    'grandson', 'granddaughter', 'grandchild', 'aunt', 'uncle', 'niece', 'nephew', 'cousin',
    'husband', 'wife', 'spouse', 'partner', 'fiance', 'fiancee', 'boyfriend', 'girlfriend',
    'stepmother', 'stepfather', 'stepson', 'stepdaughter', 'stepbrother', 'stepsister',
    'godmother', 'godfather', 'godson', 'goddaughter', 'ancestor', 'descendant', 'heir',

    // additions
    'inlaw', 'motherinlaw', 'fatherinlaw', 'sisterinlaw', 'brotherinlaw',
    'roommate', 'neighbor', 'friend',
  ],

  // Technology
  technology: [
    'computer', 'laptop', 'desktop', 'tablet', 'phone', 'smartphone', 'cellphone', 'telephone',
    'monitor', 'screen', 'display', 'keyboard', 'mouse', 'trackpad', 'touchpad', 'printer',
    'scanner', 'camera', 'webcam', 'microphone', 'speaker', 'headphone', 'earphone', 'earbud',
    'charger', 'cable', 'wire', 'cord', 'adapter', 'converter', 'router', 'modem', 'switch',
    'hub', 'server', 'network', 'internet', 'wifi', 'bluetooth', 'usb', 'hdmi', 'ethernet',
    'software', 'hardware', 'firmware', 'app', 'application', 'program', 'website', 'webpage',
    'browser', 'search', 'engine', 'database', 'cloud', 'storage', 'memory', 'processor', 'chip',
    'cpu', 'gpu', 'ram', 'ssd', 'hdd', 'drive', 'disk', 'flash', 'card', 'slot', 'port',
    'battery', 'power', 'outlet', 'plug', 'socket', 'surge', 'protector', 'ups', 'generator',
    'robot', 'drone', 'satellite', 'radar', 'sonar', 'laser', 'led', 'lcd', 'oled', 'plasma',
    'virtual', 'reality', 'augmented', 'artificial', 'intelligence', 'machine', 'learning',
    'algorithm', 'code', 'script', 'function', 'variable', 'loop', 'array', 'object', 'class',

    // additions
    'terminal', 'command', 'cli', 'shell', 'bash', 'zsh', 'powershell',
    'github', 'gitlab', 'git', 'commit', 'branch', 'merge', 'pullrequest',
    'api', 'endpoint', 'request', 'response', 'json', 'yaml', 'xml',
    'docker', 'container', 'kubernetes', 'pod', 'cluster', 'namespace',
    'http', 'https', 'tls', 'ssl', 'dns', 'ip', 'tcp', 'udp',
    'bug', 'issue', 'ticket', 'jira',
  ],

  // Reading & Writing
  'reading/writing': [
    'book', 'novel', 'story', 'tale', 'chapter', 'page', 'cover', 'spine', 'bookmark', 'library',
    'magazine', 'newspaper', 'journal', 'diary', 'notebook', 'notepad', 'paper', 'pen', 'pencil',
    'marker', 'crayon', 'chalk', 'eraser', 'ruler', 'stapler', 'clip', 'tape', 'glue', 'envelope',
    'stamp', 'letter', 'postcard', 'memo', 'note', 'list', 'form', 'document', 'file', 'folder',
    'binder', 'textbook', 'workbook', 'manual', 'guide', 'handbook', 'dictionary', 'encyclopedia',
    'atlas', 'almanac', 'thesaurus', 'biography', 'memoir', 'essay', 'poem', 'sonnet', 'haiku',
    'fiction', 'nonfiction', 'fantasy', 'mystery', 'thriller', 'romance', 'horror', 'comedy',
    'drama', 'tragedy', 'epic', 'saga', 'series', 'trilogy', 'sequel', 'prequel', 'prologue',
    'epilogue', 'index', 'glossary', 'appendix', 'bibliography', 'citation', 'quote', 'excerpt',
    'paragraph', 'sentence', 'word', 'syllable', 'vowel', 'consonant', 'grammar', 'punctuation',
    'comma', 'period', 'colon', 'semicolon', 'apostrophe', 'hyphen', 'dash', 'parenthesis',

    // additions
    'headline', 'byline', 'footnote', 'endnote', 'outline', 'draft', 'revision', 'edit',
    'publish', 'author', 'reader',
  ],

  // Household & everyday items
  household: [
    'garbage', 'trash', 'rubbish', 'waste', 'litter', 'junk', 'debris', 'clutter', 'mess',
    'bag', 'box', 'bin', 'can', 'bucket', 'basket', 'container', 'jar', 'bottle', 'cup',
    'mug', 'glass', 'plate', 'bowl', 'dish', 'pot', 'pan', 'lid', 'handle', 'spout',
    'sink', 'faucet', 'tap', 'drain', 'pipe', 'hose', 'valve', 'knob', 'switch', 'lever',
    'door', 'window', 'wall', 'floor', 'ceiling', 'roof', 'stairs', 'step', 'ramp', 'rail',
    'fence', 'gate', 'lock', 'key', 'hinge', 'latch', 'bolt', 'screw', 'nail', 'hook',
    'shelf', 'rack', 'hanger', 'peg', 'clip', 'pin', 'needle', 'thread', 'string', 'rope',
    'tape', 'glue', 'staple', 'rubber', 'band', 'wire', 'chain', 'link', 'ring', 'loop',
    'towel', 'cloth', 'rag', 'sponge', 'brush', 'broom', 'mop', 'duster', 'vacuum', 'filter',
    'soap', 'detergent', 'bleach', 'cleaner', 'polish', 'wax', 'spray', 'foam', 'gel', 'powder',
    'trash', 'recycle', 'compost', 'disposal', 'landfill', 'dump', 'pile', 'heap', 'stack',

    // additions
    'laundry', 'washer', 'dryer', 'dishwasher', 'fridge', 'freezer', 'microwave', 'oven', 'stove',
    'toaster', 'blender', 'mixer', 'kettle', 'coffeemaker',
    'batteries', 'flashlight', 'candle', 'matches', 'lighter',
  ],

  // Miscellaneous common words
  action: [
    'dig', 'run', 'walk', 'jump', 'hop', 'skip', 'leap', 'climb', 'crawl', 'swim', 'fly', 'drive',
    'ride', 'sail', 'row', 'paddle', 'pedal', 'push', 'pull', 'lift', 'carry', 'drag', 'drop',
    'throw', 'catch', 'kick', 'hit', 'punch', 'slap', 'grab', 'hold', 'release', 'squeeze',
    'twist', 'turn', 'spin', 'roll', 'flip', 'slide', 'glide', 'bounce', 'shake', 'wave',
    'point', 'reach', 'stretch', 'bend', 'fold', 'wrap', 'tie', 'knot', 'cut', 'slice', 'chop',
    'dice', 'mince', 'grate', 'peel', 'crack', 'break', 'smash', 'crush', 'grind', 'blend',
    'mix', 'stir', 'whisk', 'beat', 'pour', 'fill', 'empty', 'drain', 'rinse', 'wash', 'scrub',
    'wipe', 'dry', 'polish', 'shine', 'clean', 'sweep', 'mop', 'vacuum', 'dust', 'spray',
    'paint', 'draw', 'write', 'type', 'print', 'copy', 'paste', 'delete', 'save', 'send',
    'receive', 'open', 'close', 'lock', 'unlock', 'enter', 'exit', 'start', 'stop', 'pause',
    'play', 'record', 'rewind', 'forward', 'search', 'find', 'seek', 'discover', 'explore',
    'travel', 'visit', 'arrive', 'depart', 'leave', 'return', 'stay', 'wait', 'rest', 'sleep',
    'wake', 'dream', 'think', 'imagine', 'remember', 'forget', 'learn', 'teach', 'study',
    'read', 'speak', 'talk', 'say', 'tell', 'ask', 'answer', 'question', 'explain', 'describe',
    'listen', 'hear', 'watch', 'see', 'look', 'observe', 'notice', 'smell', 'taste', 'touch',
    'feel', 'sense', 'know', 'understand', 'believe', 'doubt', 'trust', 'hope', 'wish', 'want',
    'need', 'like', 'love', 'hate', 'fear', 'worry', 'care', 'help', 'support', 'protect',
    'defend', 'attack', 'fight', 'compete', 'win', 'lose', 'succeed', 'fail', 'try', 'attempt',
    'begin', 'finish', 'complete', 'achieve', 'accomplish', 'create', 'make', 'build', 'design',
    'plan', 'organize', 'arrange', 'prepare', 'cook', 'bake', 'fry', 'boil', 'steam', 'grill',
    'roast', 'toast', 'heat', 'cool', 'freeze', 'melt', 'burn', 'smoke', 'fire', 'light',
    'shine', 'glow', 'flash', 'spark', 'explode', 'crash', 'collide', 'bump', 'fall', 'rise',
    'grow', 'shrink', 'expand', 'contract', 'increase', 'decrease', 'add', 'subtract', 'multiply',
    'divide', 'count', 'measure', 'weigh', 'balance', 'compare', 'match', 'sort', 'group',
    'separate', 'join', 'connect', 'attach', 'detach', 'remove', 'install', 'repair', 'fix',
    // Eating/drinking actions
    'bite', 'chew', 'swallow', 'sip', 'gulp', 'drink', 'eat', 'lick', 'suck', 'nibble', 'munch',
    'chomp', 'gnaw', 'devour', 'gobble', 'feast', 'dine', 'snack', 'feed', 'starve', 'digest',
    // Body actions
    'breathe', 'inhale', 'exhale', 'cough', 'sneeze', 'yawn', 'hiccup', 'burp', 'sigh', 'gasp',
    'pant', 'snore', 'sniff', 'blow', 'whistle', 'hum', 'sing', 'shout', 'yell', 'scream',
    'whisper', 'mumble', 'mutter', 'groan', 'moan', 'laugh', 'giggle', 'chuckle', 'cry', 'weep',
    'sob', 'smile', 'grin', 'frown', 'wink', 'blink', 'stare', 'glare', 'squint', 'nod', 'shrug',
    // Hand/touch actions
    'clap', 'snap', 'tap', 'pat', 'rub', 'scratch', 'pinch', 'poke', 'tickle', 'stroke', 'pet',
    'hug', 'kiss', 'cuddle', 'caress', 'fondle', 'grip', 'grasp', 'clutch', 'toss', 'fling',
    // Posture/movement
    'sit', 'stand', 'kneel', 'crouch', 'squat', 'lie', 'lean', 'slouch', 'duck', 'dodge',
    'stumble', 'trip', 'slip', 'skid', 'stride', 'march', 'stomp', 'tiptoe', 'sneak', 'creep',
    'dash', 'sprint', 'jog', 'stroll', 'wander', 'roam', 'pace', 'shuffle', 'limp', 'hobble',
    // Other common actions
    'aim', 'shoot', 'fire', 'load', 'unload', 'pack', 'unpack', 'stuff', 'cram', 'jam',
    'plug', 'unplug', 'charge', 'power', 'boot', 'reboot', 'log', 'click', 'tap', 'swipe',
    'scroll', 'zoom', 'scan', 'browse', 'surf', 'post', 'share', 'tweet', 'text', 'call',
    'dial', 'ring', 'buzz', 'beep', 'honk', 'knock', 'bang', 'slam', 'thud', 'thump',
    'rattle', 'clatter', 'clang', 'chime', 'ding', 'ping', 'pop', 'crack', 'snap', 'click',

    // additions
    'approve', 'reject', 'accept', 'decline', 'invite', 'confirm', 'cancel', 'schedule',
    'upload', 'download', 'install', 'uninstall', 'configure', 'deploy', 'build', 'test',
  ],
  size: [
    'big', 'small', 'large', 'tiny', 'huge', 'giant', 'massive', 'enormous', 'immense', 'vast',
    'miniature', 'microscopic', 'compact', 'petite', 'slim', 'thin', 'thick', 'wide', 'narrow',
    'broad', 'long', 'short', 'tall', 'deep', 'shallow', 'high', 'low', 'heavy', 'light',
    'dense', 'sparse', 'full', 'empty', 'crowded', 'spacious', 'roomy', 'cramped', 'tight',

    // additions
    'oversized', 'undersized', 'bulky', 'chunky', 'tiny', 'minuscule', 'colossal',
  ],
  quality: [
    'good', 'bad', 'great', 'terrible', 'excellent', 'poor', 'perfect', 'flawed', 'best', 'worst',
    'better', 'worse', 'fine', 'okay', 'decent', 'average', 'mediocre', 'superior', 'inferior',
    'strong', 'weak', 'powerful', 'feeble', 'tough', 'fragile', 'durable', 'delicate', 'sturdy',
    'solid', 'hollow', 'soft', 'hard', 'smooth', 'rough', 'sharp', 'dull', 'bright', 'dim',
    'clear', 'cloudy', 'clean', 'dirty', 'pure', 'mixed', 'fresh', 'stale', 'new', 'old',
    'young', 'ancient', 'modern', 'classic', 'fancy', 'plain', 'simple', 'complex', 'easy',
    'difficult', 'fast', 'slow', 'quick', 'rapid', 'swift', 'gentle', 'harsh', 'mild', 'severe',
    'hot', 'cold', 'warm', 'cool', 'wet', 'dry', 'moist', 'humid', 'arid', 'frozen', 'melted',
    'liquid', 'solid', 'gas', 'loud', 'quiet', 'silent', 'noisy', 'calm', 'wild', 'tame',
    'safe', 'dangerous', 'risky', 'secure', 'stable', 'shaky', 'steady', 'wobbly', 'balanced',
    'crooked', 'straight', 'curved', 'bent', 'twisted', 'flat', 'bumpy', 'level', 'uneven',
    'open', 'closed', 'locked', 'sealed', 'loose', 'tight', 'free', 'trapped', 'stuck',
    'rich', 'poor', 'wealthy', 'expensive', 'cheap', 'costly', 'valuable', 'worthless', 'rare',
    'common', 'unique', 'ordinary', 'special', 'normal', 'strange', 'weird', 'odd', 'unusual',
    'regular', 'irregular', 'standard', 'custom', 'original', 'fake', 'real', 'genuine', 'authentic',
    'true', 'false', 'right', 'wrong', 'correct', 'incorrect', 'accurate', 'precise', 'exact',
    'approximate', 'rough', 'detailed', 'specific', 'general', 'broad', 'narrow', 'limited',
    'unlimited', 'infinite', 'finite', 'complete', 'incomplete', 'partial', 'whole', 'entire',
    'total', 'full', 'empty', 'blank', 'filled', 'loaded', 'packed', 'crowded', 'sparse',

    // additions
    'reliable', 'unreliable', 'efficient', 'inefficient', 'usable', 'broken', 'buggy', 'stable',
    'unstable', 'secure', 'insecure',
  ],

  // ===== NEW CATEGORIES =====

  // Direction & location concepts
  direction: [
    'north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest',
    'left', 'right', 'up', 'down', 'above', 'below', 'inside', 'outside', 'near', 'far',
    'front', 'back', 'behind', 'ahead', 'between', 'around', 'through',
  ],

  // School / education
  school: [
    'class', 'course', 'lesson', 'lecture', 'homework', 'assignment', 'project', 'quiz', 'test',
    'exam', 'midterm', 'final', 'grade', 'score', 'reportcard', 'semester', 'syllabus',
    'student', 'teacher', 'principal', 'campus', 'cafeteria', 'gym', 'locker',
  ],

  // Office / business
  office: [
    'meeting', 'agenda', 'minutes', 'deadline', 'milestone', 'deliverable', 'stakeholder',
    'client', 'customer', 'vendor', 'invoice', 'receipt', 'budget', 'forecast', 'proposal',
    'contract', 'policy', 'procedure', 'handoff', 'oncall',
  ],

  // Finance
  finance: [
    'cash', 'money', 'coin', 'bill', 'bank', 'account', 'deposit', 'withdrawal', 'transfer',
    'credit', 'debit', 'loan', 'mortgage', 'interest', 'fee', 'tax', 'refund', 'salary', 'wage',
    'savings', 'checking', 'investment', 'stock', 'bond', 'portfolio', 'dividend',
  ],

  // Math (useful for hinting/classification)
  math: [
    'addition', 'subtraction', 'multiplication', 'division', 'algebra', 'geometry', 'calculus',
    'equation', 'inequality', 'function', 'graph', 'slope', 'intercept', 'derivative', 'integral',
    'matrix', 'vector', 'probability', 'statistics', 'mean', 'median', 'mode', 'variance',
  ],

  // Science
  science: [
    'atom', 'molecule', 'element', 'compound', 'reaction', 'acid', 'base', 'salt',
    'gravity', 'energy', 'force', 'motion', 'velocity', 'acceleration', 'friction',
    'cell', 'dna', 'gene', 'protein', 'enzyme', 'bacteria', 'virus', 'fungus',
    'ecosystem', 'habitat', 'species', 'evolution',
  ],

  // Space
  space: [
    'space', 'planet', 'star', 'sun', 'moon', 'galaxy', 'nebula', 'asteroid', 'comet',
    'meteor', 'meteorite', 'orbit', 'eclipse', 'telescope', 'astronaut', 'spacesuit',
    'launch', 'rocket', 'capsule', 'station',
  ],

  // Kitchen items (more specific than household/food)
  kitchen: [
    'spoon', 'fork', 'knife', 'spatula', 'ladle', 'whisk', 'tongs', 'peeler', 'grater',
    'cuttingboard', 'colander', 'strainer', 'measuringcup', 'measuringspoon',
    'skillet', 'saucepan', 'stockpot', 'baking', 'sheetpan', 'mold',
  ],

  // Bathroom items
  bathroom: [
    'toilet', 'shower', 'bathtub', 'sink', 'mirror', 'towel', 'washcloth',
    'toothbrush', 'toothpaste', 'floss', 'mouthwash',
    'soap', 'shampoo', 'conditioner', 'razor', 'deodorant',
  ],

  // Transportation infrastructure
  transport: [
    'road', 'street', 'highway', 'freeway', 'intersection', 'crosswalk', 'sidewalk',
    'bridge', 'tunnel', 'rail', 'station', 'platform', 'terminal', 'runway', 'gate',
    'traffic', 'signal', 'stoplight', 'sign', 'speedlimit',
  ],

  // Common programming terms (separate from general technology)
  programming: [
    'typescript', 'javascript', 'python', 'java', 'csharp', 'go', 'rust',
    'frontend', 'backend', 'api', 'sdk', 'library', 'framework',
    'compiler', 'runtime', 'package', 'module', 'dependency',
    'unit', 'integration', 'e2e', 'mock', 'stub', 'fixture',
    'bug', 'regression', 'refactor', 'deploy', 'pipeline',
  ],
};

// Build reverse lookup map: word -> category
const wordToCategory: Map<string, string> = new Map();

for (const [category, words] of Object.entries(categoryWords)) {
  for (const word of words) {
    wordToCategory.set(word.toLowerCase(), category);
  }
}

/**
 * Get the category for a word
 * @param word The word to categorize
 * @returns The category name, or null if not found
 */
export function getWordCategory(word: string): string | null {
  return wordToCategory.get(word.toLowerCase()) || null;
}

/**
 * Get categories for multiple words
 * @param words Array of words to categorize
 * @returns Array of category names (null for unknown words)
 */
export function getWordCategories(words: string[]): (string | null)[] {
  return words.map(word => getWordCategory(word));
}

/**
 * Check if a word has a known category
 */
export function hasCategory(word: string): boolean {
  return wordToCategory.has(word.toLowerCase());
}

/**
 * Get all categorized words as a Set for efficient lookup
 */
export function getCategorizedWords(): Set<string> {
  return new Set(wordToCategory.keys());
}

export { categoryWords };

