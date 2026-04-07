

import Fuse from 'fuse.js'
import data from './intents.json'
import { BOT_CONFIG } from './config'

let fuse = null
let patternMap = []

function init() {
  patternMap = data.intents.flatMap(intent =>
    intent.patterns.map(p => ({ pattern: p, tag: intent.tag }))
  )

  fuse = new Fuse(patternMap, {
    keys: ['pattern'],
    threshold: BOT_CONFIG.threshold
  })
}
init()

function getIntent(tag) {
  return data.intents.find(i => i.tag === tag)
}

function getRandomResponse(responses) {
  return responses[Math.floor(Math.random() * responses.length)]
}

export function getBotResponse(input) {
  const cleaned = input.toLowerCase().trim()
  const result = fuse.search(cleaned)

  if (!result.length) {
    return getRandomResponse(getIntent('fallback').responses)
  }

  const intent = getIntent(result[0].item.tag)
  return getRandomResponse(intent.responses)
}
