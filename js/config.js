// SUPABASE CONFIG (REST API, no SDK)
// ══════════════════════════════════════
const SB_URL = 'https://pnwxpuwsoprfehdvnlik.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud3hwdXdzb3ByZmVoZHZubGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTE5MjIsImV4cCI6MjA5NjgyNzkyMn0.aDdixCpy7l4NR3zK-WyOCvBmFLmZ7pbP8Pg4w8WYClg';
const SB_HEADERS = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };

// ══════════════════════════════════════

// DEFAULT CARDS
// ══════════════════════════════════════
const DEFAULT_CARDS = [
  {word:"average",meaning:"平均的",pos:"形容词",phonetic:"",emoji:"📊",morphology:[],collocations:[{phrase:"average temperature",example:"The average temperature in July is 32°C. / 七月的平均气温是32摄氏度。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"temperature",meaning:"气温、温度",pos:"名词",phonetic:"",emoji:"🌡️",morphology:[],collocations:[{phrase:"take one's temperature",example:"The temperature fell to zero last night. / 昨晚气温降到了零度。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"findings",meaning:"调查结果",pos:"名词复数",phonetic:"",emoji:"🔍",morphology:[],collocations:[{phrase:"research findings",example:"The findings show that students sleep less now. / 研究结论表明学生现在睡眠更少了。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:"💡 findings 通常用复数，很少说 a finding。"},
  {word:"presentations",meaning:"展示汇报",pos:"名词复数",phonetic:"",emoji:"📢",morphology:[],collocations:[{phrase:"give a presentation",example:"She gave a great presentation in class. / 她在课堂上做了很棒的汇报。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"conversations",meaning:"交谈、对话",pos:"名词复数",phonetic:"",emoji:"💬",morphology:[],collocations:[{phrase:"have a conversation with sb.",example:"We had a long conversation about the weather. / 我们就天气进行了一次长谈。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"its",meaning:"它的",pos:"物主代词",phonetic:"",emoji:"🐾",morphology:[],collocations:[{phrase:"its tail",example:"The dog wagged its tail happily. / 那只狗高兴地摇着它的尾巴。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:"⚠️ 易错：its = 它的（无撇号）；it's = it is 的缩写（有撇号）"},
  {word:"predict",meaning:"预测、预报",pos:"动词",phonetic:"",emoji:"🌦️",morphology:[],collocations:[{phrase:"predict the weather",example:"Can you predict tomorrow's weather? / 你能预测明天的天气吗？"}],irregularForms:[],synonyms:[],wordFamily:[],tip:"💡 古人靠观察动物来预测天气——燕子低飞，代表快要下雨了！"},
  {word:"wind",meaning:"风",pos:"名词",phonetic:"",emoji:"🌬️",morphology:[],collocations:[{phrase:"from the north",example:"The wind is blowing from the north. / 风从北方吹来。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"direction",meaning:"方向",pos:"名词",phonetic:"",emoji:"🧭",morphology:[],collocations:[{phrase:"in the direction of",example:"Walk in the direction of the school. / 朝学校的方向走。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"fell",meaning:"生病、病倒",pos:"动词（fall的过去式）",phonetic:"",emoji:"🤒",morphology:[],collocations:[{phrase:"fall ill",example:"He fell ill after the picnic. / 野餐后他病倒了。"}],irregularForms:[{label:"原形",form:"fall"}],synonyms:[],wordFamily:[],tip:""},
  {word:"what",meaning:"什么",pos:"代词",phonetic:"",emoji:"❓",morphology:[],collocations:[{phrase:"What is ... like?",example:"What is the weather like today? / 今天天气怎么样？"}],irregularForms:[],synonyms:[],wordFamily:[],tip:"💡 What is … like? 和 How is …? 都能用来问状态，非常经典！"},
  {word:"resort",meaning:"度假胜地",pos:"名词",phonetic:"",emoji:"🏖️",morphology:[],collocations:[{phrase:"beach resort",example:"Sanya is a famous beach resort in China. / 三亚是中国著名的海滨度假胜地。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"picnic",meaning:"野餐",pos:"名词/动词",phonetic:"",emoji:"🧺",morphology:[],collocations:[{phrase:"go on a picnic",example:"Let's go on a picnic this weekend! / 这周末我们去野餐吧！"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"effect",meaning:"影响、效果",pos:"名词",phonetic:"",emoji:"⚡",morphology:[],collocations:[{phrase:"the effect of A on B",example:"The effect of sunshine on plants is huge. / 阳光对植物的影响很大。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"since",meaning:"从……以来、自从",pos:"介词/连词",phonetic:"",emoji:"⏳",morphology:[],collocations:[{phrase:"since then",example:"I have lived here since 2020. / 我从2020年就住在这里了。"}],irregularForms:[],synonyms:[],wordFamily:[],tip:""},
  {word:"weather",meaning:"天气怎么样？",pos:"固定句型",phonetic:"",emoji:"☀️",morphology:[],collocations:[{phrase:"What is the weather like?",example:"What is the weather like in Beijing in winter? / 北京冬天的天气怎么样？"}],irregularForms:[],synonyms:[],wordFamily:[],tip:"💡 What is … like? 不只能问天气，也能问任何事物的状态！"}
];

// ══════════════════════════════════════
// EMOJI / BG
// ══════════════════════════════════════
const EMOJI_POOL = ['📝','🌟','💡','🎯','🔑','🌈','🎪','🧩','🎨','🔮','🌺','🦋','🎭','🏆','🎸'];
function getEmoji(card, index) { return card.emoji || EMOJI_POOL[index % EMOJI_POOL.length]; }
const BG_POOL = [
  'linear-gradient(135deg,#E8F4FD,#B8DCEF)',
  'linear-gradient(135deg,#FFE8E8,#FFCACA)',
  'linear-gradient(135deg,#FFF8E1,#FFE9A0)',
  'linear-gradient(135deg,#EDE7F6,#D1C4E9)',
  'linear-gradient(135deg,#E8F5E9,#C8E6C9)',
  'linear-gradient(135deg,#FFF3E0,#FFE0B2)',
  'linear-gradient(135deg,#E3F2FD,#BBDEFB)',
  'linear-gradient(135deg,#E0F7FA,#B2EBF2)',
  'linear-gradient(135deg,#F3E5F5,#E1BEE7)',
  'linear-gradient(135deg,#FCE4EC,#F8BBD0)',
];
function getBg(index) { return BG_POOL[index % BG_POOL.length]; }

// ══════════════════════════════════════
