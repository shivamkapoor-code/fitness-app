export function calcBioAge(bodyMetrics, inflam) {
  const BASE_AGE = 36
  const latest = bodyMetrics.length > 0 ? bodyMetrics[bodyMetrics.length - 1] : null

  let penalty = 0

  const visceral = latest?.visceralFat ?? 11
  if (visceral < 9) penalty -= 2
  else if (visceral > 11) penalty += 2

  const bf = latest?.bodyFat ?? 23.7
  if (bf < 18) penalty -= 3
  else if (bf < 22) penalty -= 1
  else if (bf < 25) penalty += 1
  else penalty += 3

  const recentDates = Object.keys(inflam).sort().slice(-14)
  const avgInflam =
    recentDates.length > 0
      ? recentDates.reduce((a, d) => a + calcInflamScore(inflam[d]), 0) / recentDates.length
      : 3

  if (avgInflam > 4) penalty += 2
  else if (avgInflam > 3) penalty += 1
  else if (avgInflam <= 2) penalty -= 2

  return Math.max(20, BASE_AGE + penalty)
}

export function calcInflamScore(dayInflam) {
  if (!dayInflam) return 3
  let score = 3
  if (dayInflam.zone2) score -= 0.5
  if (dayInflam.salmon) score -= 0.5
  if (dayInflam.cold) score -= 0.5
  if (dayInflam.breathing) score -= 0.5
  const sleep = dayInflam.sleep ?? 7
  if (sleep >= 8) score -= 0.5
  else if (sleep < 6) score += 1
  return Math.max(0, Math.min(5, score))
}
