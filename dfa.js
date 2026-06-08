/* ============================================================
   dfa.js — DFA Definitions & Engine
   M = (Q, Sigma, delta, q0, F)
   ============================================================ */

const LEVELS = [
  {
    name:   "ends in 'b'",
    desc:   "String must END with 'b'",
    hint:   "alphabet {a,b} — last symbol decides!",
    alpha:  ["a", "b"],
    states: ["q0", "q1"],
    accept: ["q1"],
    start:  "q0",
    trans: {
      "q0": { "a": "q0", "b": "q1" },
      "q1": { "a": "q0", "b": "q1" }
    },
    yes: ["b", "ab", "aab", "abb", "bbb"],
    no:  ["a", "ba", "aa",  "bba", "aba"]
  },
  {
    name:   "even a's",
    desc:   "EVEN number of 'a's (0 counts!)",
    hint:   "q0=even(accept), q1=odd — toggles on each a",
    alpha:  ["a", "b"],
    states: ["q0", "q1"],
    accept: ["q0"],
    start:  "q0",
    trans: {
      "q0": { "a": "q1", "b": "q0" },
      "q1": { "a": "q0", "b": "q1" }
    },
    yes: ["", "bb", "aa", "aabb", "abba"],
    no:  ["a", "ab", "ba", "aab",  "bba"]
  },
  {
    name:   "starts with 'ab'",
    desc:   "String must START with 'ab'",
    hint:   "wrong first char → dead state qd!",
    alpha:  ["a", "b"],
    states: ["q0", "q1", "q2", "qd"],
    accept: ["q2"],
    start:  "q0",
    trans: {
      "q0": { "a": "q1", "b": "qd" },
      "q1": { "a": "qd", "b": "q2" },
      "q2": { "a": "q2", "b": "q2" },
      "qd": { "a": "qd", "b": "qd" }
    },
    yes: ["ab", "aba", "abb",  "abab", "abba"],
    no:  ["a",  "b",   "ba",   "aab",  "bab"]
  },
  {
    name:   "no '11' in binary",
    desc:   "Binary: no two consecutive 1s!",
    hint:   "'11' anywhere → dead state qd",
    alpha:  ["0", "1"],
    states: ["q0", "q1", "qd"],
    accept: ["q0", "q1"],
    start:  "q0",
    trans: {
      "q0": { "0": "q0", "1": "q1"  },
      "q1": { "0": "q0", "1": "qd"  },
      "qd": { "0": "qd", "1": "qd"  }
    },
    yes: ["0", "1", "10", "101",  "010"],
    no:  ["11","011","110","111","1011"]
  }
];

/**
 * runDFA(str, levelIndex)
 * Traces the string through the DFA transition function.
 * Returns { ok: true, state } on acceptance
 * Returns { ok: false, msg }  on rejection
 */
function runDFA(str, levelIndex) {
  const l = LEVELS[levelIndex];

  // Alphabet check
  for (const ch of str) {
    if (!l.alpha.includes(ch)) {
      return { ok: false, msg: `Symbol "${ch}" not in {${l.alpha.join(",")}}` };
    }
  }

  // Trace transition function δ
  let state = l.start;
  for (const ch of str) {
    const next = l.trans[state]?.[ch];
    if (!next) {
      return { ok: false, msg: `No transition from ${state} on '${ch}'` };
    }
    state = next;
    if (state === "qd") {
      return { ok: false, msg: "Dead/trap state qd reached — REJECTED" };
    }
  }

  // Check acceptance
  if (l.accept.includes(state)) {
    return { ok: true, state };
  }
  return { ok: false, msg: `State ${state} is not an accepting state` };
}
