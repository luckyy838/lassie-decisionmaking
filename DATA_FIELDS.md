# Exported session fields

This describes one participant record in `lassie-sessions.json`, the file downloaded by **Export all** on the admin page. The download contains every session that has not been hidden. The stage filter on the page does not change what is exported.

```json
{
  "exportedAt": "2026-11-10T20:30:00.000Z",
  "sessions": [
    {
      "id": 1,
      "createdAt": 1762817340000,
      "stage": "survey",
      "explanationEnabled": true,
      "explanationChoice": "random",
      "payload": {}
    }
  ]
}
```

`createdAt` is milliseconds since the Unix epoch. `explanationEnabled` is `true` for the With-explanation branch and `false` for Without. `explanationChoice` is `"random"` for a normal assigned session. `stage` is also stored inside `payload`.

The per-session **JSON** button downloads `payload` alone. The fields below are the contents of `payload`.

## Session

| Field | Meaning | Values |
| --- | --- | --- |
| `sessionId` | Stable id for this participant. The conclusion save and the survey save update the same row. | UUID string |
| `stage` | How far the participant got when this copy was saved. | `"conclusion"` after the conclusion page, before the survey. `"survey"` after the survey is submitted. |
| `dataVersion` | Which prepared dataset was used. | `{ "local": 1 }` |
| `explanationEnabled` | Whether this participant saw the explanation chart and the two explanation questions. | `true` or `false` |
| `explanationChoice` | How the branch was assigned. | `"random"` |
| `hypothesisConfidence` | Confidence in the hypothesis on the conclusion page. | One of `"1 - Not at all confident"` through `"7 - Extremely confident"`, or `null` if it was never set. |
| `conclusionFreeResponse` | Older free-text conclusion field. The current conclusion page does not ask this. | Usually `""` |
| `importantPoints` | Scatter points the participant marked as particularly important. | Array of `{ rowIndex, measurementIndex, waypointIndex, moisture, strength }`. Empty if none were marked. |
| `ignoredPoints` | Scatter points the participant marked as ignored. | Same shape as `importantPoints`. |
| `importantWeighedEqually` | The participant checked that every point was weighed equally on the important-points page. | `true` or `false` |
| `ignoredConsideredEveryPoint` | The participant checked that every point was considered on the ignored-points page. | `true` or `false` |
| `userSteps` | One object per sampling round. See below. | Array |
| `surveyResponses` | Survey answers. Empty when `stage` is `"conclusion"`. | Array of `{ id, text, type, value, label? }` |

A multiple-choice survey item stores `value` as the option index (`"0"`, `"1"`, …) and `label` as the option text. A typed answer stores the typed string in `value` and has no `label`.

Survey ids, in page order:

- With only: `explanationUseFrequency` (`Always`, `Most of the time`, `Sometimes`, `Rarely`, `Never`), `explanationEase` (`Very easy`, `Easy`, `Somewhat easy`, `Difficult`, `Very difficult`).
- Both branches: `age`, `gender` (`Woman`, `Man`, `Gender Variant / Non-conforming`, `Prefer to self describe`, `Prefer not to say`), `specialization`, `yearsInSpecialization`, `workSetting`, `highestDegree` (`currently undergraduate`, `bachelors`, `masters`, `PhD`, `postdoc`, `professor`), `yearsSinceBachelors`, `scenarioFamiliarity` (`Yes`, `No`).
- Follow-ups, only when that option was selected: `genderSelfDescribe`, `specializationOther`, `workSettingOther`, `scenarioFamiliarityDetail`.

Without sessions do not contain the two explanation items.

## userSteps

Each item is one round: the participant marked a plan, Spirit returned suggestions, and the participant took one sample (or ended from that round).

Curves are 100 numbers, indexes `0`–`99`, along the transect. `infoGaussian` is the coverage curve and `dispGaussian` is the discrepancy curve. The three weighting strategies are calculated from the same pair, so each round stores the pair once. `spatialReward` and `discrepancyReward` are the curves drawn for the participant's own chosen strategy. They match `infoGaussian` and `dispGaussian`. `variableReward` is unused and is an empty array.

| Field | Meaning |
| --- | --- |
| `step` | Round number, starting at 0. |
| `objectives` | The participant's ranking for this round. Each item is `{ objective, ranking }`. Ranking 1 is the primary objective. |
| `objectiveFreeResponse` | Older free-text objective. Usually `""`. |
| `resolutionMethod` | The weighting strategy the participant chose for the study. |
| `desiredWaypoint` | The orange-star plan. `index` is the 22-bin location, `0`–`21`. |
| `robotSuggestions` | Suggestions actually drawn on the slope, in display order. This list omits a strategy whose point was already sampled, and merges strategies that landed on the same point into one marker. |
| `suggestionOverlapNote` | Sentence shown when two or more strategies landed on the same location. `""` when they did not. |
| `infoGaussian`, `dispGaussian` | The one shared 100-point coverage curve and discrepancy curve for this round. |
| `spatialReward`, `discrepancyReward` | The same curves, kept under the names the explanation chart already uses. |
| `variableReward` | Unused. `[]`. |
| `strategySuggestions` | All three strategies, including ones that were not drawn. See below. |
| `samples` | Samples on the transect at the end of this round, including the opening samples and the sample just taken. |
| `userFreeSample` | The location the participant actually sampled this round. |
| `sampleType` | `"robot"` when that sample was one of the drawn suggestions, otherwise `"user"`. |
| `hitSuggestion` | `true` when the sample was one of the drawn suggestions. |
| `acceptOrReject` | `"Followed suggestion A"` (or B or C), with the strategy name in parentheses, or `"Did not follow a suggestion"`. |
| `acceptedRobotSuggestion` | The drawn suggestion that was sampled, or `null`. |
| `matchedSuggestionLabel` | Strategy names on the marker that was sampled, or `null`. |
| `decisionConfidence` | Confidence after the sample. `"1 - Not at all confident"` through `"7 - Extremely confident"`. |
| `rejectReason` | Older single reject reason. Usually `null`; the current page stores the list below. |
| `rejectReasons` | Indexes into the reject-reason list, when the participant did not follow a suggestion. |
| `rejectReasonsOptions` | The selected reason texts. |
| `rejectReasonFreeResponse` | Text entered for "I rejected the suggested locations for a different reason." |
| `rejectExplanationRating` | Unused. `0`. |
| `transition` | Fixed text `"Mark next desired waypoint"`. |

`objectives[].objective` is one of:

- `" COVERAGE There are areas where data are missing "`
- `"HYPOTHESIS There are areas that require more data to evaluate the hypothesis"`

`resolutionMethod` is one of:

- `"One-at-a-time: choose a location that optimizes the primary objective without considering the secondary objective"`
- `"Even weighting: choose a location that addresses both the primary and secondary objective but optimizes neither"`
- `"Hierarchical:  determine locations that optimize the primary objective and from these choose a location that best addresses the secondary objective"`

The five reject-reason texts are:

1. `I did not consider Spirit's suggestions when choosing a location.`
2. `I considered Spirit's suggestions, but thought another location would better improve information coverage.`
3. `I considered Spirit's suggestions, but thought another location would better enable testing of the hypothesis.`
4. `Spirit's suggestions influenced where I chose to go, even though I did not select one of the suggested locations.`
5. `I rejected the suggested locations for a different reason.`

A point (`desiredWaypoint`, `robotSuggestions[]`, `userFreeSample`, `samples[]`) has `index` (`0`–`21`), `type` (`"initial"`, `"robot"`, or `"user"`), `measurements`, `normOffsetX`, `normOffsetY`, and `isHovered`. A drawn suggestion also has `methodLabel` and `methodIndexes`. A taken sample also has `moisture` and `shear` arrays.

## strategySuggestions

Length 3 on every round. Order is the participant's chosen strategy, then the other two. Nothing on the page is recomputed for this list: each object is one `/process` response, plus whether that response was drawn.

| Field | Meaning | Values |
| --- | --- | --- |
| `methodIndex` | Strategy id. | `0` One-at-a-time, `1` Even weighting, `2` Hierarchical. |
| `methodLabel` | Short strategy name. | `"One-at-a-time"`, `"Even weighting"`, `"Hierarchical"`. |
| `objectiveRepre` | Weight sent to `/process` for this strategy. `0` is coverage only and `1` is discrepancy only. | `0`, `0.25`, `0.5`, `0.75`, or `1`. With coverage primary: One-at-a-time `0`, Even weighting `0.5`, Hierarchical `0.25`. With hypothesis primary: One-at-a-time `1`, Even weighting `0.5`, Hierarchical `0.75`. |
| `finalType` | The five-level weight the selector actually used. | `0`, `0.25`, `0.5`, `0.75`, or `1`. |
| `finalLevel` | The selector's number before it is snapped to `finalType`. | A number, or `null` when an information override fired. An override does not compute this number. |
| `waypointIndex` | Suggested location on the 22-bin transect. | Integer `0`–`21`, or `null` if the response was not a valid bin. |
| `index100` | Where that bin sits on the 100-point curve. This is the curve index inside the bin with the largest coverage-plus-discrepancy value. | Integer `0`–`99`, or `null`. |
| `infoRewardRaw` | Coverage reward of the suggested bin. Each bin is the maximum of the 100-point coverage values that fall in it. | Number, or `null`. |
| `dispRewardRaw` | Discrepancy reward of the suggested bin, aggregated the same way. | Number, or `null`. |
| `infoRewardNormalized` | Coverage reward after the min-max normalization the selector used. | Number, or `null`. |
| `dispRewardNormalized` | Discrepancy reward after that same normalization. | Number, or `null`. |
| `suggestionSets` | The five candidate bins, in weight order `0`, `0.25`, `0.5`, `0.75`, `1`. The suggested bin is `suggestionSets[finalType * 4]`. | Five integers, each `0`–`21`. |
| `informationLevel` | Coverage level for this round. The same value is on all three strategies. | Number, typically `0`–`1`. |
| `dispSignature` | Discrepancy signal passed into the selector. It is the maximum of the 100-point discrepancy curve. | Number. |
| `discrepancySignalLevel` | The thresholded discrepancy signal added into `finalLevel`. | `0`, `0.25`, `0.5`, `0.75`, or `1` in the normal branch. `null` when an information override skipped that branch. |
| `informationOverride` | Whether a coverage rule replaced the weighted choice. Below `0.27`, the selector forces the coverage-focused candidate. Above `0.7`, it forces the discrepancy-focused candidate. | `null`, `"information_low"`, or `"information_high"`. |
| `shown` | Whether this strategy was drawn as its own A/B/C marker. | `true` or `false`. |
| `displayLabel` | The marker letter. A strategy hidden by overlap keeps the letter of the marker it was merged into. | `"A"`, `"B"`, `"C"`, or `null`. |
| `hiddenReason` | Why it was not drawn as its own marker. | `null` when `shown` is `true`. `"overlap"` when a strategy already on the page landed on this bin. `"visited"` when the bin was already in the sample list. |

`/process` removes already-sampled bins before it chooses, so a normal round does not return a sampled bin and `hiddenReason` is `"visited"` only when every bin `0`–`21` is already in the sample list. In that fallback the selector considers all 22 bins again, and any strategy whose returned bin is already sampled is saved with `shown: false`, `displayLabel: null`, and `hiddenReason: "visited"`. The rewards and candidate list are still the values `/process` returned.

## Short example

One round. The 100-point curves are shortened. Hierarchical landed on the same bin as Even weighting, so it was not drawn separately. The third object is the shape of a strategy whose bin was already sampled.

```json
{
  "sessionId": "0da5f406-62a4-4f6b-b783-73749936484c",
  "stage": "survey",
  "dataVersion": { "local": 1 },
  "explanationEnabled": true,
  "explanationChoice": "random",
  "hypothesisConfidence": "5 - Very confident",
  "userSteps": [
    {
      "step": 0,
      "resolutionMethod": "One-at-a-time: choose a location that optimizes the primary objective without considering the secondary objective",
      "infoGaussian": [0.98, 0.99, "... 96 numbers ...", 0.12, 0.08],
      "dispGaussian": [0.07, 0.08, "... 96 numbers ...", 0.04, 0.03],
      "spatialReward": [0.98, 0.99, "... 96 numbers ...", 0.12, 0.08],
      "discrepancyReward": [0.07, 0.08, "... 96 numbers ...", 0.04, 0.03],
      "robotSuggestions": [
        { "index": 5, "methodLabel": "One-at-a-time", "methodIndexes": [0] },
        { "index": 6, "methodLabel": "Even weighting / Hierarchical", "methodIndexes": [1, 2] }
      ],
      "strategySuggestions": [
        {
          "methodIndex": 0,
          "methodLabel": "One-at-a-time",
          "objectiveRepre": 0,
          "finalType": 0,
          "finalLevel": 0,
          "waypointIndex": 5,
          "index100": 24,
          "infoRewardRaw": 0.9999,
          "dispRewardRaw": 0.0744,
          "infoRewardNormalized": 1,
          "dispRewardNormalized": 0.973,
          "suggestionSets": [5, 4, 4, 5, 4],
          "informationLevel": 0.3048,
          "dispSignature": 0.0764,
          "discrepancySignalLevel": 0,
          "informationOverride": null,
          "shown": true,
          "displayLabel": "A",
          "hiddenReason": null
        },
        {
          "methodIndex": 1,
          "methodLabel": "Even weighting",
          "objectiveRepre": 0.5,
          "finalType": 0.5,
          "finalLevel": 0.5,
          "waypointIndex": 6,
          "index100": 31,
          "infoRewardRaw": 0.9997,
          "dispRewardRaw": 0.9677,
          "infoRewardNormalized": 0.9996,
          "dispRewardNormalized": 1,
          "suggestionSets": [5, 6, 6, 5, 6],
          "informationLevel": 0.3048,
          "dispSignature": 0.9677,
          "discrepancySignalLevel": 0,
          "informationOverride": null,
          "shown": true,
          "displayLabel": "B",
          "hiddenReason": null
        },
        {
          "methodIndex": 2,
          "methodLabel": "Hierarchical",
          "objectiveRepre": 0.25,
          "finalType": 0.25,
          "finalLevel": 0.25,
          "waypointIndex": 6,
          "index100": 31,
          "infoRewardRaw": 0.9997,
          "dispRewardRaw": 0.9677,
          "infoRewardNormalized": 0.9996,
          "dispRewardNormalized": 1,
          "suggestionSets": [5, 6, 6, 5, 6],
          "informationLevel": 0.3048,
          "dispSignature": 0.9677,
          "discrepancySignalLevel": 0,
          "informationOverride": null,
          "shown": false,
          "displayLabel": "B",
          "hiddenReason": "overlap"
        }
      ]
    }
  ],
  "surveyResponses": []
}
```

A strategy hidden because its bin was already sampled looks like this. `finalLevel` and `discrepancySignalLevel` are `null` here because coverage was above `0.7`, so the selector forced the discrepancy-focused candidate and did not compute the intermediate level.

```json
{
  "methodIndex": 0,
  "methodLabel": "One-at-a-time",
  "objectiveRepre": 0,
  "finalType": 1,
  "finalLevel": null,
  "waypointIndex": 0,
  "index100": 4,
  "infoRewardRaw": 0.2036,
  "dispRewardRaw": 0.000011,
  "infoRewardNormalized": 0.5758,
  "dispRewardNormalized": 1,
  "suggestionSets": [19, 1, 1, 0, 0],
  "informationLevel": 0.7675,
  "dispSignature": 0.000011,
  "discrepancySignalLevel": null,
  "informationOverride": "information_high",
  "shown": false,
  "displayLabel": null,
  "hiddenReason": "visited"
}
```
