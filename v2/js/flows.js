// The four practices as data. The wizard (wizard.js) renders any flow defined here.
//
// Step fields:
//   key       where the answer is stored (entry.answers[key]; 'content' maps to entry.content)
//   type      text | choice | multi | scale | date | blessing
//   options   option values; labels come from f.<flow>.<key>.<value> (or <optPrefix>.<value>)
//   required  cannot skip
//   showIf    (answers) => bool, step is hidden when false
//   suggest   (answers) => value, marks one option as "Suggested"
//   note      choice/multi steps also take an optional free-text note
const SOURCES = ['need', 'habit', 'environment', 'others', 'heredity', 'divine', 'unknown'];

const FLOWS = {
    thought: {
        accent: 'var(--c-thought)',
        decisionKey: 'action',
        steps: [
            { key: 'content', type: 'text', required: true },
            { key: 'sources', type: 'multi', options: SOURCES, optPrefix: 'src' },
            { key: 'nature', type: 'choice', options: ['good', 'harmful', 'unsure'] },
            {
                key: 'action', type: 'choice', options: ['encourage', 'letgo', 'watch'],
                suggest: a => ({ good: 'encourage', harmful: 'letgo', unsure: 'watch' })[a.nature]
            },
            { key: 'resolve', type: 'text', showIf: a => a.nature === 'harmful' || a.action === 'letgo' },
            { key: 'behind', type: 'choice', options: ['none', 'desire', 'worry', 'anger'] }
        ]
    },

    desire: {
        accent: 'var(--c-desire)',
        decisionKey: 'decision',
        dueKey: 'dueDate',
        steps: [
            { key: 'content', type: 'text', required: true },
            { key: 'kind', type: 'choice', options: ['necessity', 'comfort', 'luxury'] },
            { key: 'capacity', type: 'choice', options: ['yes', 'partly', 'no'] },
            { key: 'harm', type: 'choice', options: ['none', 'some', 'serious'], note: true },
            { key: 'timing', type: 'choice', options: ['now', 'later', 'unsure'] },
            {
                key: 'decision', type: 'choice', options: ['fulfil', 'plan', 'modify', 'drop'],
                suggest: a => {
                    if (a.harm === 'serious') return a.kind === 'necessity' ? 'modify' : 'drop';
                    if (a.harm === 'some') return 'modify';
                    if (a.capacity === 'no' || a.timing === 'later') return 'plan';
                    if (a.kind === 'luxury' && a.capacity !== 'yes') return 'plan';
                    return 'fulfil';
                }
            },
            { key: 'firstStep', type: 'text', showIf: a => a.decision === 'fulfil' },
            { key: 'dueDate', type: 'date', showIf: a => a.decision === 'plan' },
            { key: 'modified', type: 'text', showIf: a => a.decision === 'modify' },
            { key: 'dropReason', type: 'text', showIf: a => a.decision === 'drop' }
        ]
    },

    worry: {
        accent: 'var(--c-worry)',
        decisionKey: 'group',
        dueKey: 'dueDate',
        relief: ['weightBefore', 'weightAfter'],
        steps: [
            { key: 'content', type: 'text', required: true, splitLines: true },
            { key: 'weightBefore', type: 'scale' },
            { key: 'reality', type: 'choice', options: ['now', 'might', 'imagined'] },
            { key: 'control', type: 'choice', options: ['yes', 'partly', 'no'] },
            {
                key: 'group', type: 'choice', options: ['drop', 'now', 'later', 'accept'],
                suggest: a => {
                    if (a.reality === 'imagined') return 'drop';
                    if (a.control === 'no') return 'accept';
                    if (a.control === 'yes' && a.reality === 'now') return 'now';
                    return 'later';
                }
            },
            { key: 'release', type: 'text', showIf: a => a.group === 'drop' },
            { key: 'action', type: 'text', showIf: a => a.group === 'now' },
            { key: 'dueDate', type: 'date', showIf: a => a.group === 'later' },
            { key: 'plan', type: 'text', showIf: a => a.group === 'later' },
            { key: 'acceptance', type: 'text', showIf: a => a.group === 'accept' },
            { key: 'weightAfter', type: 'scale' }
        ]
    },

    anger: {
        accent: 'var(--c-anger)',
        decisionKey: 'response',
        relief: ['intensityBefore', 'intensityAfter'],
        steps: [
            { key: 'content', type: 'text', required: true },
            { key: 'who', type: 'text', short: true },
            { key: 'intensityBefore', type: 'scale' },
            { key: 'expectation', type: 'text' },
            { key: 'cost', type: 'multi', options: ['health', 'sleep', 'peace', 'relationship', 'work', 'words'], note: true },
            { key: 'theirSide', type: 'multi', options: SOURCES, optPrefix: 'src', note: true },
            { key: 'response', type: 'choice', options: ['tolerate', 'adjust', 'forgive', 'talk', 'letgo'] },
            { key: 'blessing', type: 'blessing' },
            { key: 'intensityAfter', type: 'scale' }
        ]
    }
};

const FLOW_TYPES = Object.keys(FLOWS);

// Rough keyword hint for the triage cards. The user always makes the final choice.
const TRIAGE_HINTS = {
    anger: /\b(angry|anger|annoy\w*|irritat\w*|furious|hate|mad at|frustrat\w*|hurt me|insult\w*|rage|fed up|pissed)\b/i,
    worry: /\b(worr\w*|afraid|fear\w*|scared|anxious|anxiety|what if|nervous|tension|stress\w*|panic\w*|concern\w*)\b/i,
    desire: /\b(i want|want to|wanna|wish|i need|need to buy|should buy|hope to|crav\w*|longing|dream of|i'd love|desire)\b/i
};

function guessType(text) {
    if (!text || text.trim().length < 3) return null;
    for (const type of ['anger', 'worry', 'desire']) {
        if (TRIAGE_HINTS[type].test(text)) return type;
    }
    return 'thought';
}

function stepVisible(step, answers) {
    return !step.showIf || step.showIf(answers || {});
}

function stepAnswer(entry, step) {
    return step.key === 'content' ? entry.content : entry.answers[step.key];
}

function optionLabel(type, step, value) {
    return t(`${step.optPrefix || `f.${type}.${step.key}`}.${value}`);
}

// Human-readable answer for summaries
function formatAnswer(type, step, value) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return '';
    if (step.type === 'choice') return optionLabel(type, step, value);
    if (step.type === 'multi') return value.map(v => optionLabel(type, step, v)).join(', ');
    if (step.type === 'scale') return `${value} / 5`;
    if (step.type === 'date') return formatDate(value);
    if (step.type === 'blessing') return value ? t('f.anger.blessing.done') : '';
    return String(value);
}

// Outcome is derived from answers when a flow is finished
function computeOutcome(entry) {
    const flow = FLOWS[entry.type];
    const a = entry.answers;
    const outcome = { ...entry.outcome, decision: a[flow.decisionKey] || null };
    outcome.dueDate = flow.dueKey && stepVisible(flow.steps.find(s => s.key === flow.dueKey), a) ? (a[flow.dueKey] || null) : null;
    if (flow.relief) {
        const [b, f] = flow.relief;
        outcome.before = a[b] || null;
        outcome.after = a[f] || null;
    }
    return outcome;
}
