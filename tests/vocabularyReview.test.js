const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'js/vocabularyReviewData.js'), 'utf8'), context);

const words = JSON.parse(vm.runInContext('JSON.stringify(reviewWords)', context));
const expected = [
  ['line', '/laɪn/', '线；排队'],
  ['cucumber', '/ˈkjuːkʌmbə/', '黄瓜'],
  ['bonnet', '/ˈbɒnɪt/', '汽车引擎盖'],
  ['messy', '/ˈmesi/', '凌乱的；脏乱的'],
  ['polish', '/ˈpɒlɪʃ/', '擦亮；磨光'],
  ['puddle', '/ˈpʌdl/', '水坑；小水洼'],
  ['soapy', '/ˈsəʊpi/', '有肥皂的；满是肥皂泡的'],
  ['sponge', '/spʌndʒ/', '海绵'],
  ['naughty', '/ˈnɔːti/', '淘气的；不听话的'],
  ['handsome', '/ˈhænsəm/', '英俊的'],
  ['mirror', '/ˈmɪrə(r)/', '镜子'],
  ['lab', '/læb/', '实验室'],
  ['poor', '/pʊə/', '贫穷的；差的；可怜的'],
  ['ship', '/ʃɪp/', '船；运送']
];

assert.equal(words.length, expected.length);
assert.deepEqual(words.map(item => [item.word, item.phonetic, item.meaning]), expected);
for (const item of words) {
  assert.equal(item.image, `assets/vocabulary-review/${item.word}.png`);
  assert.ok(fs.existsSync(path.join(root, item.image)), `missing image: ${item.image}`);
  assert.equal(item.placeholder, '✨');
}

console.log('vocabulary review data tests passed');
