import test from "node:test";
import assert from "node:assert/strict";
import { SettlementAgent } from "../dist/core/modules/settlement-agent.js";

test("settlement agent produces summary, state delta, chronology, and open loops", () => {
  const agent = new SettlementAgent();
  const result = agent.settle({
    chapterNumber: 1,
    draft: {
      chapterNumber: 1,
      title: "第一次反抗",
      content: "林凡当众夺回灵石，赵执事因此记恨，后续资源可能被断供。",
      summary: "工作稿",
      basedOnPlan: 1,
    },
    plan: {
      targetChapterNumber: 1,
      chapterMission: "主角第一次反抗规则，并获得短期收益，同时埋下代价。",
      readerGoal: "让读者获得爽点与隐患感。",
      sceneBlueprint: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-林凡",
          sceneNumber: 1,
          pov: "林凡",
          goal: "在资源分发中建立不公",
          conflict: "陈师兄与赵执事联手压制",
          turn: "林凡意识到继续忍耐只会失去最后的资源",
          result: "林凡当众出手，夺回灵石，但被赵执事记恨",
          newInformation: ["赵执事会在后续资源上打压林凡"],
          emotionalShift: "压抑 -> 爆发",
          drivingCharacter: "林凡",
          opposingForce: "赵执事",
          decision: "当众反抗",
          cost: "后续资源被断供",
          relationshipChange: "林凡与外门执事彻底对立",
          thematicTension: "反抗有代价",
          valuePositionA: "反抗",
          valuePositionB: "忍耐",
          sceneStance: "偏向反抗",
          styleDirective: "快节奏",
        },
      ],
      characterIntent: [],
      themeIntent: "推进反抗有代价",
      thematicQuestion: "弱者是否能不付代价地改变命运？",
      styleProfile: {
        narrationStyle: "直接",
        dialogueStyle: "锋利",
        pacingProfile: "快",
        descriptionDensity: "低",
        toneConstraints: [],
      },
      gateNote: "",
    },
    analysis: {
      scenes: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-林凡",
          sceneNumber: 1,
          pov: "林凡",
          goal: "在资源分发中建立不公",
          conflict: "陈师兄与赵执事联手压制",
          turn: "林凡意识到继续忍耐只会失去最后的资源",
          result: "林凡当众出手，夺回灵石，但被赵执事记恨",
          newInformation: ["赵执事会在后续资源上打压林凡"],
          emotionalShift: "压抑 -> 爆发",
          sourceParagraphs: ["林凡当众夺回灵石，赵执事因此记恨。"],
        },
      ],
      characterStates: [
        {
          name: "林凡",
          desire: "改变命运",
          fear: "继续被踩在底层",
          misbelief: "只要忍耐就能熬过去",
          recentDecision: "当众反抗陈师兄",
          decisionCost: "赵执事开始记恨并可能断供",
          relationshipShift: ["与赵执事彻底结仇"],
          arcProgress: "第一次公开反抗规则",
          presentInChapter: true,
        },
      ],
      themeReport: {
        chapterNumber: 1,
        activeThemes: [],
      },
      styleReport: {
        averageSentenceLength: 18,
        dialogueRatio: 0.35,
        descriptionRatio: 0.15,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 1,
        scores: {
          hook: 8,
          momentum: 8,
          emotionalPeak: 8,
          suspense: 7,
          memorability: 7,
        },
        summary: "爽点成立，但代价已经埋下。",
        strengths: [],
        risks: ["赵执事记恨林凡，后续资源可能被断供。"],
        revisionSuggestions: [],
      },
      gateDecision: {
        chapterNumber: 1,
        gate: null,
        required: false,
        rationale: "",
      },
      revisionBrief: "",
    },
    previousChronology: { events: [] },
    previousOpenLoops: { loops: [] },
  });

  assert.equal(result.chapterSummary.chapterNumber, 1);
  assert.equal(result.chapterStateDelta.chapterNumber, 1);
  assert.equal(result.chronology.events.length, 1);
  assert.ok(result.openLoops.loops.length >= 1);
  assert.ok(result.relationships.entries.some((entry) => entry.relationshipId.includes("林凡") || entry.characters.includes("林凡")));
  assert.ok(result.chapterSummary.openedLoopIds.length >= 1);
  assert.ok(result.chapterStateDelta.updatedLoops.some((loop) => loop.action === "opened"));
  assert.match(result.chronology.events[0].summary, /忍耐|资源|反抗|夺回|灵石|规则/u);
  assert.match(result.chronology.events[0].consequence, /断供|记恨|后续资源/u);
  assert.ok(result.openLoops.loops.some((loop) => /断供|记恨/u.test(loop.description)));
});

test("settlement agent prefers markerless prose paragraphs over noisy analysis excerpts", () => {
  const agent = new SettlementAgent();
  const result = agent.settle({
    chapterNumber: 2,
    draft: {
      chapterNumber: 2,
      title: "矿洞后的夜里",
      content: [
        "# 第2章 矿洞后的夜里",
        "",
        "林凡在矿洞领到最脏最危险的一段废道清理任务，负责记录的弟子还故意少给他半袋照明石。",
        "",
        "他回到木屋时，发现门口挂着一张新的差役牌：明日起转去西三区深井，若拒不服从，停发三月配给。",
        "",
        "---",
        "基于规划章节: 2",
      ].join("\n"),
      summary: "工作稿",
      basedOnPlan: 2,
    },
    plan: {
      targetChapterNumber: 2,
      chapterMission: "把赵执事的打压转成具体苦役，并让林凡意识到自己已经没有退路。",
      readerGoal: "承接上一章代价，让压迫落地。",
      sceneBlueprint: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-矿洞苦役",
          sceneNumber: 1,
          pov: "林凡",
          goal: "把打压变成具体苦役",
          conflict: "林凡被分到最危险的废道，还被克扣照明石",
          turn: "他确认赵执事已经开始动手卡资源",
          result: "林凡意识到打压不是口头威胁，而是马上生效",
          newInformation: ["外门记录弟子也开始配合赵执事压人"],
          emotionalShift: "烦闷 -> 警惕",
          drivingCharacter: "赵执事",
          opposingForce: "林凡的残余安全感",
          decision: "林凡决定先把苦役扛下来，再找机会回敬",
          cost: "他必须接受更危险的差役",
          relationshipChange: "林凡与赵执事的结怨转成持续打压",
          thematicTension: "反抗之后，代价持续追上来",
          valuePositionA: "低头换资源",
          valuePositionB: "硬扛打压找活路",
          sceneStance: "压向更冷的现实代价",
          styleDirective: "快节奏，不抒情。",
        },
        {
          sceneId: "scene-2",
          sceneAnchor: "scene-2-深井差役",
          sceneNumber: 2,
          pov: "林凡",
          goal: "把后续威胁钉成下一章必须承接的事项",
          conflict: "新的差役牌把林凡逼向更危险的深井",
          turn: "停发三月配给的处罚被直接写死",
          result: "林凡没有退路，只能准备去更危险的地方",
          newInformation: ["西三区深井会成为下一章直接压力点"],
          emotionalShift: "警惕 -> 更冷的决意",
          drivingCharacter: "赵执事",
          opposingForce: "林凡的生存余地",
          decision: "林凡决定接下这张差役牌",
          cost: "一旦拒绝就会失去三月配给",
          relationshipChange: "赵执事与林凡从报复转成制度性围剿",
          thematicTension: "代价不是一次性损失，而是持续升级",
          valuePositionA: "退让保命",
          valuePositionB: "硬扛到底",
          sceneStance: "把下一章钩子钉在危险任务上",
          styleDirective: "结尾留钩子。",
        },
      ],
      characterIntent: [],
      themeIntent: "推进反抗有代价",
      thematicQuestion: "第一次反抗之后，代价会如何持续升级？",
      styleProfile: {
        narrationStyle: "直接",
        dialogueStyle: "克制",
        pacingProfile: "快",
        descriptionDensity: "低",
        toneConstraints: [],
      },
      gateNote: "",
    },
    analysis: {
      scenes: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-矿洞苦役",
          sceneNumber: 1,
          pov: "林凡",
          goal: "把打压变成具体苦役",
          conflict: "赵执事开始卡资源",
          turn: "林凡意识到威胁已经生效",
          result: "林凡被迫接受危险苦役",
          newInformation: ["赵执事已经动手"],
          emotionalShift: "烦闷 -> 警惕",
          sourceParagraphs: ["场景结束时获得有限推进，赵执事会公开偏帮有背景的弟子。"],
        },
        {
          sceneId: "scene-2",
          sceneAnchor: "scene-2-深井差役",
          sceneNumber: 2,
          pov: "林凡",
          goal: "把威胁钉成下一章压力点",
          conflict: "新的差役牌逼他去深井",
          turn: "停发三月配给被写死",
          result: "林凡没有退路",
          newInformation: ["深井任务是下一章主压力"],
          emotionalShift: "警惕 -> 决意",
          sourceParagraphs: ["真正推动这个场景的是价值站队。"],
        },
      ],
      characterStates: [
        {
          name: "林凡",
          desire: "活下去并向上爬",
          fear: "被断供后彻底失去修炼机会",
          misbelief: "只要忍住就能熬过去",
          recentDecision: "先接下差役牌，再找机会回敬",
          decisionCost: "拒绝会失去三月配给，接受则要进更危险的深井",
          relationshipShift: ["与赵执事的结怨升级为持续打压"],
          arcProgress: "开始适应反抗后的连续代价",
          presentInChapter: true,
        },
      ],
      themeReport: {
        chapterNumber: 2,
        activeThemes: [],
      },
      styleReport: {
        averageSentenceLength: 16,
        dialogueRatio: 0.05,
        descriptionRatio: 0.3,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 2,
        scores: {
          hook: 7,
          momentum: 7,
          emotionalPeak: 6,
          suspense: 7,
          memorability: 6,
        },
        summary: "代价开始压实。",
        strengths: [],
        risks: ["西三区深井差役会在下一章成为直接威胁。"],
        revisionSuggestions: [],
      },
      gateDecision: {
        chapterNumber: 2,
        gate: null,
        required: false,
        rationale: "",
      },
      revisionBrief: "",
    },
    previousChronology: { events: [] },
    previousOpenLoops: { loops: [] },
  });

  assert.equal(result.chronology.events.length, 2);
  assert.ok(result.chronology.events.every((event) => !/场景结束时获得有限推进|真正推动这个场景/u.test(event.summary)));
  assert.ok(result.chronology.events.some((event) => /停发三月配给|深井/u.test(event.consequence) || /停发三月配给|深井/u.test(event.summary)));
  assert.ok(result.openLoops.loops.some((loop) => /深井|停发三月配给/u.test(loop.description)));
  assert.doesNotMatch(result.chapterSummary.summary, /场景结束时获得有限推进|真正推动这个场景/u);
});

test("settlement agent records reveal ledger entries when an old mystery is explicitly advanced", () => {
  const agent = new SettlementAgent();
  const result = agent.settle({
    chapterNumber: 3,
    draft: {
      chapterNumber: 3,
      title: "门铃声后的名字",
      content: "林凡终于明白，母亲失踪那夜的门铃声不是巧合。原来那串门铃声是有人故意留下的暗号。",
      summary: "工作稿",
      basedOnPlan: 3,
    },
    plan: {
      targetChapterNumber: 3,
      chapterMission: "把旧谜题往前推进一层。",
      readerGoal: "让读者感到真相开始露头。",
      sceneBlueprint: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-门铃",
          sceneNumber: 1,
          pov: "林凡",
          goal: "触碰母亲失踪之谜",
          conflict: "记忆与线索对不上",
          turn: "林凡终于听懂那串门铃声的意义",
          result: "旧谜题被明确推进",
          newInformation: ["门铃声是有人故意留下的暗号"],
          emotionalShift: "困惑 -> 发冷",
          drivingCharacter: "林凡",
          opposingForce: "旧记忆",
          decision: "继续追查门铃声",
          cost: "更深卷进旧案",
          relationshipChange: "与母亲失踪线重新绑定",
          thematicTension: "真相越近代价越高",
          valuePositionA: "停下自保",
          valuePositionB: "继续追查",
          sceneStance: "压向真相",
          styleDirective: "压低说明，保留悬念",
        },
      ],
      characterIntent: [],
      themeIntent: "真相的代价",
      thematicQuestion: "追查真相是否值得继续付代价",
      styleProfile: {
        narrationStyle: "直接",
        dialogueStyle: "克制",
        pacingProfile: "快",
        descriptionDensity: "低",
        toneConstraints: [],
      },
      gateNote: "",
    },
    analysis: {
      scenes: [
        {
          sceneId: "scene-1",
          sceneAnchor: "scene-1-门铃",
          sceneNumber: 1,
          pov: "林凡",
          goal: "触碰母亲失踪之谜",
          conflict: "记忆与线索对不上",
          turn: "林凡终于听懂那串门铃声的意义",
          result: "旧谜题被明确推进",
          newInformation: ["门铃声是有人故意留下的暗号"],
          emotionalShift: "困惑 -> 发冷",
          sourceParagraphs: ["林凡终于明白，母亲失踪那夜的门铃声不是巧合。"],
        },
      ],
      characterStates: [
        {
          name: "林凡",
          desire: "找出母亲失踪真相",
          fear: "真相会把自己拖进更深的危险",
          misbelief: "只要追得够快就能扛住代价",
          recentDecision: "继续追查门铃声",
          decisionCost: "会更深卷进旧案",
          relationshipShift: ["与母亲失踪线重新绑定"],
          arcProgress: "开始主动逼近真相线",
          presentInChapter: true,
        },
      ],
      themeReport: {
        chapterNumber: 3,
        activeThemes: [],
      },
      styleReport: {
        averageSentenceLength: 14,
        dialogueRatio: 0.05,
        descriptionRatio: 0.2,
        rhythmNote: "",
        adherenceNote: "",
        styleDriftPoints: [],
        dialogueHomogeneitySpots: [],
        descriptionBalanceNote: "",
      },
      readerReport: {
        chapterNumber: 3,
        scores: {
          hook: 8,
          momentum: 7,
          emotionalPeak: 7,
          suspense: 8,
          memorability: 7,
        },
        summary: "旧谜题明显往前推进了。",
        strengths: [],
        risks: ["真相线一旦被推进，后续必须继续承接。"],
        revisionSuggestions: [],
      },
      gateDecision: {
        chapterNumber: 3,
        gate: null,
        required: false,
        rationale: "",
      },
      revisionBrief: "",
    },
    previousChronology: { events: [] },
    previousOpenLoops: {
      loops: [
        {
          loopId: "loop-ch0001-02",
          type: "mystery",
          introducedInChapter: 1,
          owner: "林凡",
          description: "母亲失踪那夜的门铃声到底意味着什么",
          expectedPayoffWindow: "soon",
          urgency: "high",
          status: "open",
          payoffConstraints: ["近几章必须持续推进谜题"],
          relatedEntities: ["林凡", "母亲", "门铃声"],
          evidenceRefs: ["scene-4"],
          lastUpdatedChapter: 1,
        },
      ],
    },
  });

  assert.equal(result.reveals.entries.length, 1);
  assert.equal(result.reveals.entries[0].sourceLoopId, "loop-ch0001-02");
  assert.match(result.reveals.entries[0].revealedTruth, /门铃声|暗号|真相/u);
});
