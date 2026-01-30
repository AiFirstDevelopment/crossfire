const fs = require('fs');
const content = fs.readFileSync('shared/dictionary/categories.ts', 'utf8');

// New categorization for action words (camelCase for keys)
const newCategories = {
  'movement': [
    'arrive', 'bounce', 'climb', 'crawl', 'creep', 'dash', 'depart', 'dodge',
    'enter', 'escape', 'exit', 'glide', 'hobble', 'hop', 'jog', 'leap', 'leave',
    'limp', 'paddle', 'pedal', 'return', 'ride', 'rise', 'roam', 'roll', 'row',
    'run', 'sail', 'shuffle', 'skid', 'skip', 'slide', 'sneak', 'spin', 'stomp',
    'stride', 'stroll', 'stumble', 'swim', 'tiptoe', 'travel', 'trip', 'turn',
    'twist', 'walk', 'wander', 'zoom'
  ],
  'speech': [
    'answer', 'ask', 'claim', 'demand', 'deny', 'describe', 'explain', 'mumble',
    'mutter', 'question', 'say', 'shout', 'speak', 'talk', 'tell', 'whisper', 'yell'
  ],
  'vocalSound': [
    'burp', 'chuckle', 'cough', 'cry', 'gasp', 'giggle', 'groan', 'hiccup', 'hum',
    'laugh', 'moan', 'scream', 'sigh', 'sing', 'sneeze', 'snore', 'sob', 'weep',
    'whistle', 'yawn'
  ],
  'physicalContact': [
    'bang', 'bump', 'caress', 'carry', 'catch', 'clutch', 'collide', 'cuddle',
    'drag', 'drop', 'fling', 'fondle', 'grab', 'grasp', 'grip', 'hit', 'hold',
    'hug', 'kick', 'kiss', 'knock', 'lift', 'pat', 'pet', 'pinch', 'poke', 'pull',
    'push', 'rub', 'scratch', 'slap', 'slam', 'squeeze', 'stroke', 'tickle',
    'toss', 'touch'
  ],
  'eating': [
    'chew', 'chomp', 'devour', 'digest', 'dine', 'drink', 'eat', 'feast', 'gnaw',
    'gobble', 'gulp', 'munch', 'nibble', 'pour', 'sip', 'snack', 'starve', 'stuff',
    'swallow', 'toast'
  ],
  'perception': [
    'blink', 'detect', 'discover', 'feel', 'find', 'glare', 'hear', 'listen',
    'look', 'notice', 'observe', 'see', 'seek', 'sense', 'smell', 'sniff',
    'squint', 'stare', 'wink'
  ],
  'thinking': [
    'believe', 'care', 'doubt', 'dream', 'expect', 'forget', 'hate', 'imagine',
    'know', 'learn', 'need', 'remember', 'think', 'trust', 'understand', 'want',
    'wish', 'worry'
  ],
  'computerAction': [
    'boot', 'click', 'compile', 'configure', 'debug', 'delete', 'dial', 'execute',
    'install', 'load', 'log', 'paste', 'pause', 'print', 'reboot', 'record',
    'rewind', 'save', 'scan', 'scroll', 'swipe', 'type', 'uninstall', 'unload',
    'unlock', 'unplug'
  ],
  'creation': [
    'arrange', 'build', 'combine', 'create', 'draw', 'group', 'make', 'organize',
    'paint', 'plan', 'prepare', 'write'
  ],
  'destruction': [
    'break', 'burn', 'crack', 'crash', 'crush', 'cut', 'explode', 'fire', 'melt',
    'shoot', 'smash'
  ],
  'repair': [
    'fix', 'repair'
  ],
  'soundEffect': [
    'beep', 'buzz', 'clang', 'clatter', 'ding', 'honk', 'rattle', 'snap', 'spark',
    'thud', 'thump'
  ],
  'bodyPosition': [
    'balance', 'bend', 'crouch', 'kneel', 'lean', 'lie', 'nod', 'rest', 'shrug',
    'slouch', 'squat', 'stand', 'stay', 'stretch', 'wait'
  ],
  'breathing': [
    'blow', 'exhale', 'inhale', 'pant'
  ],
  'facialExpression': [
    'frown', 'grin', 'smile'
  ],
  'socialAction': [
    'attack', 'battle', 'compete', 'defend', 'fight', 'help', 'invite', 'join',
    'protect', 'support', 'visit'
  ],
  'achievement': [
    'accept', 'accomplish', 'achieve', 'attempt', 'begin', 'cancel', 'close',
    'confirm', 'decline', 'fail', 'finish', 'lose', 'receive', 'reject', 'release',
    'start', 'stop', 'succeed', 'try', 'win'
  ],
  'organizing': [
    'add', 'attach', 'compare', 'count', 'decrease', 'detach', 'divide', 'expand',
    'grow', 'increase', 'knot', 'match', 'multiply', 'pack', 'remove', 'separate',
    'shrink', 'sort', 'subtract', 'unpack', 'wrap'
  ],
  'cleaning': [
    'dust', 'sweep', 'wash', 'wipe'
  ],
  'miscellaneousAction': [
    'charge', 'cram', 'deliver', 'dig', 'glow', 'grind', 'heat', 'read', 'reach',
    'send', 'shine', 'sleep', 'suck', 'teach', 'wake', 'wave', 'schedule'
  ]
};

// Find the action category and remove it
const actionRegex = /  action:\s*\[[\s\S]*?\],\n/;
const match = content.match(actionRegex);

if (!match) {
  console.error('Could not find action category');
  process.exit(1);
}

// Build the new categories string
let newCategoriesStr = '';
for (const [key, words] of Object.entries(newCategories)) {
  const sortedWords = [...words].sort();
  newCategoriesStr += '  ' + key + ': [\n';
  for (const word of sortedWords) {
    newCategoriesStr += '    "' + word + '",\n';
  }
  newCategoriesStr += '  ],\n';
}

// Replace action with new categories
const newContent = content.replace(actionRegex, newCategoriesStr);

fs.writeFileSync('shared/dictionary/categories.ts.new', newContent);
console.log('Created categories.ts.new');

// Count categories
const oldCatCount = (content.match(/^\s{2}\w+:/gm) || []).length;
const newCatCount = (newContent.match(/^\s{2}\w+:/gm) || []).length;
console.log('Old category count:', oldCatCount);
console.log('New category count:', newCatCount);
console.log('Added categories:', newCatCount - oldCatCount);
