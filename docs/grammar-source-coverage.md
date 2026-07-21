# 英语语法知识点来源覆盖矩阵

本报告由 `scripts/generate-grammar-coverage-report.mjs` 从结构化数据生成。运行时权威数据为 `grammar-library/data/source-coverage.json`。

- D1：59 / 59
- D2：65 / 65
- D3：29 / 29
- 合计：153

| 来源编号 | 原知识点 | 目标 topic_key | 站内标题 | 处理方式 | 说明 |
|---|---|---|---|---|---|
| D1-01 | 单数代词及 a/an | `articles` | a / an / the 与零冠词 | merged | 代词基础并入主格主题，a/an 并入冠词主题 |
| D1-02 | 复数代词及复数名词 | `noun-number` | 名词单复数 | merged | 复数代词由代词系统承接，复数名词在本主题直教 |
| D1-03 | 形容词用法 | `adjectives-linking-verbs` | 形容词与感官系动词 | direct | 进入形容词与状态描述 |
| D1-04 | 一般疑问句 | `sentence-types` | 陈述、否定与疑问句综合 | merged | 按谓语类型统一处理 |
| D1-05 | Yes 的用法 | `be-questions-answers` | be 动词一般疑问句与简短回答 | merged | 并入简短回答 |
| D1-06 | No 的用法 | `be-questions-answers` | be 动词一般疑问句与简短回答 | merged | 并入简短回答 |
| D1-07 | 人称代词的所有格 | `possessive-pronouns` | 形容词性与名词性物主代词 | direct | 区分形容词性和名词性物主代词 |
| D1-08 | What 疑问句与专有名词 | `what-who-where` | what / who / where 的共同框架 | merged | what 进入疑问词框架，专有名词由名词主题承接 |
| D1-09 | Why 疑问句 | `why-because-so` | why / because / so | direct | 与原因和结果同教 |
| D1-10 | every 的用法 | `how-often` | how often 与次数表达 | merged | 与频率和次数表达同教 |
| D1-11 | because | `why-because-so` | why / because / so | direct | 与 why、so 同教 |
| D1-12 | Who 疑问句 | `what-who-where` | what / who / where 的共同框架 | direct | 用于建立疑问句共同框架 |
| D1-13 | How 疑问句与 fine | `adjectives-linking-verbs` | 形容词与感官系动词 | merged | how 描述状态与形容词回答同教 |
| D1-14 | Where 疑问句 | `what-who-where` | what / who / where 的共同框架 | direct | 先建框架，再进入地点主题 |
| D1-15 | in + 地点 | `place-prepositions` | 地点介词 | direct | 进入地点介词 |
| D1-16 | on + 地点 | `place-prepositions` | 地点介词 | direct | 进入地点介词 |
| D1-17 | 其他地点介词 | `place-prepositions` | 地点介词 | direct | 进入地点介词 |
| D1-18 | Whose 疑问句 | `whose` | whose 询问所有关系 | direct | 与所有关系同教 |
| D1-19 | 单复数名词所有格 | `noun-possessive` | 名词所有格 | direct | 进入名词所有格 |
| D1-20 | Which 疑问句 | `which` | which 表限定范围内的选择 | direct | 明确为限定范围选择 |
| D1-21 | 定冠词 the 与无生命所有格 | `noun-possessive` | 名词所有格 | merged | the 由冠词主题承接，无生命所有格在本主题讲 of |
| D1-22 | but / and / or | `conjunctions-clauses` | 连词与复合句 | direct | 进入并列连词 |
| D1-23 | although / so | `why-because-so` | why / because / so | merged | so 进入原因结果，although 紧随其后扩展 |
| D1-24 | There be 与数字写法 | `there-be` | there is / there are | merged | there be 直教，数字写法由数词主题承接 |
| D1-25 | have 与三大人称 | `have-vs-there-be` | 拥有与存在 | direct | 与存在表达对比 |
| D1-26 | teach、主格与宾格 | `pronoun-system` | 人称代词完整使用 | merged | 宾格进入完整代词系统，teach 作为及物动词例子 |
| D1-27 | do / does | `simple-present-negative-question` | 一般现在时否定句与一般疑问句 | direct | 进入一般现在时句式变化 |
| D1-28 | 肯定回答 | `simple-present-negative-question` | 一般现在时否定句与一般疑问句 | merged | 并入 do/does 简短回答 |
| D1-29 | don't / doesn't | `simple-present-negative-question` | 一般现在时否定句与一般疑问句 | direct | 进入一般现在时否定句 |
| D1-30 | many / much | `quantifiers` | many / much / some / any / a lot of | direct | 与可数不可数和数量同教 |
| D1-31 | When 作为疑问词和连词 | `time-date-weekday-weather` | 时间、日期、星期和天气问句 | merged | 疑问词先进入时间主题，连词用法在复合句扩展 |
| D1-32 | How 的其他用法 | `adjectives-linking-verbs` | 形容词与感官系动词 | merged | how old/how tall 在状态描述，数量与频率分别分流 |
| D1-33 | 及物动词与不及物动词 | `verb-system` | 动词系统 | direct | 进入动词系统 |
| D1-34 | 动词不定式 | `infinitives-complex-verbs` | 不定式、复杂动词搭配与从句扩展 | advanced | 常用搭配可先接触，完整系统保留为进阶 |
| D1-35 | 频度副词 | `frequency-adverbs` | 频度副词的位置 | direct | 与 how often 同模块 |
| D1-36 | 方式副词构成与用法 | `adverbs` | 副词的分类、位置与比较 | direct | 进入副词系统 |
| D1-37 | 地点副词与时间副词 | `adverbs` | 副词的分类、位置与比较 | direct | 进入副词分类 |
| D1-38 | 程度副词 | `adverbs` | 副词的分类、位置与比较 | direct | 进入副词分类 |
| D1-39 | 动词搭配介词 to / with / for | `preposition-extension` | 介词扩展 | direct | 进入动词介词搭配 |
| D1-40 | if 与 have to | `modal-extension` | may / must / have to | merged | have to 在情态扩展，if 在复合句扩展 |
| D1-41 | 虚位主语 it | `impersonal-it` | 虚位主语 it | direct | 与时间日期天气同教 |
| D1-42 | 时间介词 at / on / in | `time-prepositions` | 时间介词 at / on / in | direct | 与时间日期同教 |
| D1-43 | 原级 | `adjectives-linking-verbs` | 形容词与感官系动词 | merged | 先在形容词状态描述中建立原级 |
| D1-44 | 比较级 | `comparatives` | 比较级 | direct | 两者比较 |
| D1-45 | 最高级 | `superlatives` | 最高级 | direct | 三者及以上比较 |
| D1-46 | 现在进行时 | `present-continuous` | 现在进行时 | direct | 进入时间轴 |
| D1-47 | 现在完成时 | `present-perfect` | 现在完成时 | direct | 进入核心时态 |
| D1-48 | 现在完成进行时 | `present-perfect-continuous` | 现在完成进行时 | advanced | 保留为进阶储备 |
| D1-49 | 一般过去时 | `simple-past` | 一般过去时 | direct | 进入时间轴 |
| D1-50 | 过去进行时 | `past-continuous` | 过去进行时 | advanced | 保留为进阶储备 |
| D1-51 | 过去完成时 | `past-perfect` | 过去完成时 | advanced | 保留为进阶储备 |
| D1-52 | 过去完成进行时 | `past-perfect-continuous` | 过去完成进行时 | advanced | 保留为进阶储备 |
| D1-53 | 一般将来时 | `simple-future` | 一般将来时 | direct | 先 going to 后 will |
| D1-54 | 将来进行时 | `future-continuous` | 将来进行时 | advanced | 保留为进阶储备 |
| D1-55 | 将来完成时 | `future-perfect` | 将来完成时 | advanced | 保留为进阶储备 |
| D1-56 | 将来完成进行时 | `future-perfect-continuous` | 将来完成进行时 | advanced | 保留为进阶储备 |
| D1-57 | can / may / must | `modal-extension` | may / must / have to | merged | can 当前补强，may/must 后续扩展 |
| D1-58 | 与现在事实相反的虚拟语气 | `subjunctive-present-contrary` | 与现在事实相反的虚拟语气 | advanced | 保留为进阶储备 |
| D1-59 | 被动语态 | `passive-voice` | 被动语态 | advanced | 保留为进阶储备 |
| D2-01 | 普通名词和专有名词 | `noun-types` | 普通名词与专有名词 | direct | 进入名词基础 |
| D2-02 | 可数名词和不可数名词 | `countable-uncountable` | 可数名词与不可数名词 | direct | 进入名词基础 |
| D2-03 | 名词变复数规则 | `noun-number` | 名词单复数 | direct | 进入名词单复数 |
| D2-04 | 名词所有格 | `noun-possessive` | 名词所有格 | direct | 进入所有关系 |
| D2-05 | 不定冠词 a/an | `articles` | a / an / the 与零冠词 | direct | 进入冠词主题 |
| D2-06 | 定冠词 the | `articles` | a / an / the 与零冠词 | direct | 进入冠词主题 |
| D2-07 | 零冠词 | `articles` | a / an / the 与零冠词 | direct | 进入冠词主题 |
| D2-08 | 人称代词 | `pronoun-system` | 人称代词完整使用 | direct | 基础主格先教，完整系统后扩充 |
| D2-09 | 物主代词 | `possessive-pronouns` | 形容词性与名词性物主代词 | direct | 与所有关系同教 |
| D2-10 | 反身代词 | `pronoun-system` | 人称代词完整使用 | direct | 进入完整代词系统 |
| D2-11 | 指示代词 | `pronoun-system` | 人称代词完整使用 | direct | 进入完整代词系统 |
| D2-12 | 疑问代词 | `wh-question-method` | 特殊疑问句生成方法 | merged | 按疑问词相关主题分散教学 |
| D2-13 | 不定代词 | `pronoun-system` | 人称代词完整使用 | direct | 进入完整代词系统 |
| D2-14 | 形容词用法 | `adjectives-linking-verbs` | 形容词与感官系动词 | direct | 进入状态描述 |
| D2-15 | 形容词变副词规则 | `adverbs` | 副词的分类、位置与比较 | direct | 进入方式副词 |
| D2-16 | 形容词原级、比较级、最高级用法 | `comparatives` | 比较级 | merged | 原级、比较级、最高级按依赖拆分 |
| D2-17 | 形容词比较级与最高级变化规则 | `superlatives` | 最高级 | merged | 比较级和最高级相邻呈现 |
| D2-18 | 副词用法及分类 | `adverbs` | 副词的分类、位置与比较 | direct | 进入副词系统 |
| D2-19 | 副词位置 | `adverbs` | 副词的分类、位置与比较 | direct | 进入副词系统 |
| D2-20 | 副词原级、比较级、最高级用法 | `adverbs` | 副词的分类、位置与比较 | direct | 进入副词比较 |
| D2-21 | 副词比较级与最高级变化规则 | `adverbs` | 副词的分类、位置与比较 | direct | 进入副词比较 |
| D2-22 | 时间介词 | `time-prepositions` | 时间介词 at / on / in | direct | 基础 at/on/in 先教，后续扩展 |
| D2-23 | 地点介词 | `place-prepositions` | 地点介词 | direct | 与 where、there be 同模块 |
| D2-24 | 其他常用介词 | `preposition-extension` | 介词扩展 | direct | 进入介词扩展 |
| D2-25 | 并列连词 | `conjunctions-clauses` | 连词与复合句 | direct | 进入连词与复合句 |
| D2-26 | 从属连词 | `conjunctions-clauses` | 连词与复合句 | direct | 进入连词与复合句 |
| D2-27 | 基数词 | `numerals` | 数词 | direct | 进入数词 |
| D2-28 | 序数词 | `numerals` | 数词 | direct | 进入数词 |
| D2-29 | 常用数词表达法 | `numerals` | 数词 | direct | 进入数词 |
| D2-30 | 系动词 | `verb-system` | 动词系统 | direct | 进入动词系统 |
| D2-31 | 实义动词 | `verb-system` | 动词系统 | direct | 进入动词系统 |
| D2-32 | 实义动词的五种形式 | `verb-system` | 动词系统 | direct | 进入动词系统 |
| D2-33 | 助动词 | `sentence-be-action-aux` | be 动词句、实义动词句和助动词句 | direct | 基础分类先教，后续随时态扩展 |
| D2-34 | 情态动词 | `modal-extension` | may / must / have to | merged | can 当前补强，其余后续扩展 |
| D2-35 | 一般现在时构成及标志词 | `simple-present-use` | 一般现在时的用途与标志词 | direct | 进入一般现在时用途 |
| D2-36 | 一般现在时基本用法 | `simple-present-use` | 一般现在时的用途与标志词 | direct | 进入一般现在时用途 |
| D2-37 | 动词第三人称单数 | `third-person-singular` | 第三人称单数 | direct | 进入第三人称单数 |
| D2-38 | 一般现在时句式变化 | `simple-present-negative-question` | 一般现在时否定句与一般疑问句 | direct | 进入否定与疑问 |
| D2-39 | 一般过去时构成及标志词 | `simple-past` | 一般过去时 | direct | 进入一般过去时 |
| D2-40 | 一般过去时基本用法 | `simple-past` | 一般过去时 | direct | 进入一般过去时 |
| D2-41 | 动词过去式变化规则 | `simple-past` | 一般过去时 | direct | 进入一般过去时 |
| D2-42 | 一般过去时句式变化 | `simple-past` | 一般过去时 | direct | 进入一般过去时 |
| D2-43 | 一般将来时构成及标志词 | `simple-future` | 一般将来时 | direct | 进入一般将来时 |
| D2-44 | 一般将来时基本用法和特殊形式 | `simple-future` | 一般将来时 | direct | 进入一般将来时 |
| D2-45 | 一般将来时句式变化 | `simple-future` | 一般将来时 | direct | 进入一般将来时 |
| D2-46 | 现在进行时构成及标志词 | `present-continuous` | 现在进行时 | direct | 进入现在进行时 |
| D2-47 | 现在进行时用法 | `present-continuous` | 现在进行时 | direct | 进入现在进行时 |
| D2-48 | 现在进行时动词变化 | `present-continuous` | 现在进行时 | direct | 进入现在进行时 |
| D2-49 | 现在进行时句式变化 | `present-continuous` | 现在进行时 | direct | 进入现在进行时 |
| D2-50 | 现在完成时构成及标志词 | `present-perfect` | 现在完成时 | direct | 进入现在完成时 |
| D2-51 | 现在完成时基本用法 | `present-perfect` | 现在完成时 | direct | 进入现在完成时 |
| D2-52 | 现在完成时动词变化 | `present-perfect` | 现在完成时 | direct | 进入现在完成时 |
| D2-53 | 现在完成时句式变化 | `present-perfect` | 现在完成时 | direct | 进入现在完成时 |
| D2-54 | 肯定句的三种基本句型 | `sentence-be-action-aux` | be 动词句、实义动词句和助动词句 | merged | 按谓语类型建立基础句型 |
| D2-55 | 否定句的基本句型 | `sentence-types` | 陈述、否定与疑问句综合 | merged | 按谓语类型统一转换 |
| D2-56 | 一般疑问句结构及回答 | `sentence-types` | 陈述、否定与疑问句综合 | merged | 按谓语类型统一转换 |
| D2-57 | 陈述句变一般疑问句 | `sentence-types` | 陈述、否定与疑问句综合 | direct | 进入句型综合 |
| D2-58 | 特殊疑问句构成 | `wh-question-method` | 特殊疑问句生成方法 | direct | 进入特殊疑问句生成方法 |
| D2-59 | 特殊疑问词 | `wh-question-method` | 特殊疑问句生成方法 | merged | 按对应主题分散教学 |
| D2-60 | 肯定祈使句 | `imperatives` | 祈使句 | direct | 进入祈使句 |
| D2-61 | 否定祈使句 | `imperatives` | 祈使句 | direct | 进入祈使句 |
| D2-62 | 由 what 引导的感叹句 | `exclamations` | 感叹句 | direct | 进入感叹句 |
| D2-63 | 由 how 引导的感叹句 | `exclamations` | 感叹句 | direct | 进入感叹句 |
| D2-64 | There be 句型结构 | `there-be` | there is / there are | direct | 进入地点与存在 |
| D2-65 | There be 句型疑问句 | `there-be` | there is / there are | direct | 进入地点与存在 |
| D3-P1-01 | 走进英语的奇妙世界 | `sentence-parts` | 句子骨架：主语、谓语、宾语 | reference | 作为课程导入，不单列可考语法 |
| D3-P1-02 | 认识组成句子的零件 | `sentence-parts` | 句子骨架：主语、谓语、宾语 | direct | 进入句子骨架 |
| D3-P1-03 | 英语句子的分类 | `sentence-types` | 陈述、否定与疑问句综合 | direct | 进入句型综合 |
| D3-P1-04 | 英语发音的密码表 | `phonetics-reference` | 英语发音基础参考 | reference | 作为发音基础参考，不混入语法主线 |
| D3-W-01 | 名词 | `noun-types` | 普通名词与专有名词 | merged | 拆入名词类型、数、可数性和所有格 |
| D3-W-02 | 冠词 | `articles` | a / an / the 与零冠词 | direct | 进入冠词主题 |
| D3-W-03 | 代词 | `pronoun-system` | 人称代词完整使用 | merged | 基础主格先教，其他代词按依赖扩展 |
| D3-W-04 | 数词 | `numerals` | 数词 | direct | 进入数词 |
| D3-W-05 | 介词 | `preposition-extension` | 介词扩展 | merged | 地点和时间先教，其余后续扩展 |
| D3-W-06 | 形容词 | `adjectives-linking-verbs` | 形容词与感官系动词 | direct | 进入形容词与状态描述 |
| D3-W-07 | 副词 | `adverbs` | 副词的分类、位置与比较 | merged | 频度副词先教，其余进入副词系统 |
| D3-W-08 | 连词 | `conjunctions-clauses` | 连词与复合句 | merged | why/because/so 先教，其余进入复合句 |
| D3-W-09 | 动词 | `verb-system` | 动词系统 | merged | 基础谓语分类先教，完整系统后扩展 |
| D3-T-01 | 一般现在时 | `simple-present-use` | 一般现在时的用途与标志词 | merged | 拆入用途、第三人称单数和句式变化 |
| D3-T-02 | 现在进行时 | `present-continuous` | 现在进行时 | direct | 进入时间轴 |
| D3-T-03 | 一般将来时 | `simple-future` | 一般将来时 | direct | 进入时间轴 |
| D3-T-04 | 一般过去时 | `simple-past` | 一般过去时 | direct | 进入时间轴 |
| D3-T-05 | 现在完成时 | `present-perfect` | 现在完成时 | direct | 进入时间轴 |
| D3-T-06 | 被动语态 | `passive-voice` | 被动语态 | advanced | 保留为进阶储备 |
| D3-S-01 | 句子成分 | `sentence-parts` | 句子骨架：主语、谓语、宾语 | direct | 进入句子骨架 |
| D3-S-02 | 陈述句 | `sentence-types` | 陈述、否定与疑问句综合 | direct | 进入句型综合 |
| D3-S-03 | 一般疑问句 | `sentence-types` | 陈述、否定与疑问句综合 | direct | 进入句型综合 |
| D3-S-04 | 特殊疑问句 | `wh-question-method` | 特殊疑问句生成方法 | direct | 先建共同框架，再按疑问词分散 |
| D3-S-05 | 其他疑问句 | `sentence-types` | 陈述、否定与疑问句综合 | direct | 进入句型综合 |
| D3-S-06 | 祈使句 | `imperatives` | 祈使句 | direct | 进入祈使句 |
| D3-S-07 | 感叹句 | `exclamations` | 感叹句 | direct | 进入感叹句 |
| D3-S-08 | There be 句型 | `there-be` | there is / there are | direct | 进入地点与存在 |
| D3-S-09 | 复合句 | `conjunctions-clauses` | 连词与复合句 | direct | 进入连词与复合句 |
| D3-S-10 | 常用句式 | `situational-language` | 常用句式与情景交际 | direct | 进入情景交际 |
