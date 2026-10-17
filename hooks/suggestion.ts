import type { Suggestion } from '../types'

// A heading or bold line that opens with the 💡 the protocol asks for, in any language.
const BLOCK_START = /^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*|__)?[ \t]*💡/m
const GOAL_LINE = /^[ \t]*(?:\*\*|__)?(?:Goal|Doel|Ziel|Objectif|Objetivo|Obiettivo)\b[^\n]*/im

export const hasSuggestionBlock = (answer: string): boolean => BLOCK_START.test(answer)

// Cuts the "There's a better way" block out of a finished reply: from its 💡
// heading to the end, where the protocol puts it. Undefined when there is none.
export const extractSuggestion = (answer: string, at: number): Suggestion | undefined => {
  const start = answer.search(BLOCK_START)
  if (start < 0) {
    return undefined
  }
  const markdown = answer.slice(start).trim()
  const goal = markdown.match(GOAL_LINE)?.[0]
  const topic = goal === undefined
    ? markdown.split('\n')[0]!.replace(/[#*_💡]/g, '').trim()
    : goal.replace(/[*_]/g, '').replace(/^[^:]*:\s*/, '').trim()

  return { markdown, topic: topic.slice(0, 120), at }
}
