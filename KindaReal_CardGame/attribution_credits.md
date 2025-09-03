# Credits
Here’s the full attribution list. Short version: everything was authored in this chat; no third-party code, libraries, images, or fonts were used. We only relied on a few well-known, public-domain/standard algorithms by name:

* **Gameplay, card lists, balance, UI, and SVG art**
  Original, written in this conversation based on your requests (no external assets).

* **Shuffle algorithm**
  *Fisher–Yates* (modern Durstenfeld in-place variant) — classic method for unbiased shuffling; implemented from scratch here.

* **Seeded RNG**
  *Mulberry32* PRNG (public domain, attributed to Tommy Ettinger) — small deterministic generator used when a text seed is applied.

* **Seed hashing**
  *FNV-1a* (Fowler–Noll–Vo) 32-bit hash (offset basis `2166136261`, prime `16777619`) to turn a text seed into a 32-bit state.

* **Tiebreaker logic**
  Rock–Paper–Scissors selection/compare (simple table logic), implemented directly.

* **Accessibility pattern**
  Basic WAI-ARIA live region pattern (`aria-live="assertive"`) for log announcements; implemented directly.

This is based off of [https://chatgpt.com/share/68aeff40-0270-800c-ac85-44a8b5d3d190] which is disconnected from other chats used to create the game (which I will list below).

The below sources will be from prior chats of the game design, [https://chatgpt.com/share/68aef260-e274-800c-b7cb-753ef2b744f4].

---

### 📚 References (APA 7th ed.)

American Psychological Association. (2019). *Stress in America™: Stress and current events*. American Psychological Association. [https://www.apa.org/news/press/releases/stress/2019/stress-america-2019](https://www.apa.org/news/press/releases/stress/2019/stress-america-2019)

Centers for Disease Control and Prevention. (2023). *Benefits of physical activity*. U.S. Department of Health & Human Services. [https://www.cdc.gov/physical-activity-basics/benefits](https://www.cdc.gov/physical-activity-basics/benefits)

Substance Abuse and Mental Health Services Administration. (2020). *Recovery and recovery support*. U.S. Department of Health & Human Services. [https://www.samhsa.gov/find-help/recovery](https://www.samhsa.gov/find-help/recovery)

National Sleep Foundation. (2022). *Why sleep is important*. [https://www.thensf.org/why-sleep-is-important](https://www.thensf.org/why-sleep-is-important)

Kabat-Zinn, J. (2015). *Mindfulness for beginners: Reclaiming the present moment—and your life*. Sounds True.

Financial Consumer Protection Bureau. (2021). *Consumer complaint database*. Consumer Financial Protection Bureau. [https://www.consumerfinance.gov/data-research/consumer-complaints](https://www.consumerfinance.gov/data-research/consumer-complaints)

Federal Trade Commission. (2023). *Consumer Sentinel Network data book 2022*. Federal Trade Commission. [https://www.ftc.gov/reports/consumer-sentinel-network-data-book-2022](https://www.ftc.gov/reports/consumer-sentinel-network-data-book-2022)

Kendler, K. S., Hettema, J. M., Butera, F., Gardner, C. O., & Prescott, C. A. (2003). Life event dimensions of loss, humiliation, entrapment, and danger in the prediction of onsets of major depression and generalized anxiety. *Archives of General Psychiatry, 60*(8), 789–796. [https://doi.org/10.1001/archpsyc.60.8.789](https://doi.org/10.1001/archpsyc.60.8.789)

Holmes, T. H., & Rahe, R. H. (1967). The social readjustment rating scale. *Journal of Psychosomatic Research, 11*(2), 213–218. [https://doi.org/10.1016/0022-3999(67)90010-4](https://doi.org/10.1016/0022-3999%2867%2990010-4)

---

These sources back the **life events**, **self-help practices**, and **negative financial/legal events** you wanted represented in the game cards.
