import type { FichePayload, QuestionType } from "@/lib/schemas";
import styles from "./worksheet.module.css";

type WorksheetDocumentProps = {
  payload: FichePayload;
  numero: number;
  theme: string | null;
  dateLabel: string;
  illustrationSrc?: string | null;
};

/** Writing-line counts by question type (9 mm each).
 * Plan suggested 2/3/3/8, but 21×9 mm + ordering exceeds one A4;
 * keep short/medium/long differentiation that still fits the sheet.
 */
const LINE_COUNTS: Record<QuestionType, number> = {
  litterale: 2,
  inference: 2,
  contexte: 2,
  opinion: 4,
};

const LINE_KEYS = ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"] as const;

function WritingLines({ count }: { count: number }) {
  return (
    <div className={styles.writingLines} aria-hidden="true">
      {LINE_KEYS.slice(0, count).map((id) => (
        <div key={id} className={styles.writingLine} />
      ))}
    </div>
  );
}

function PageFooter({
  numero,
  theme,
  dateLabel,
}: {
  numero: number;
  theme: string | null;
  dateLabel: string;
}) {
  const themeLabel = theme?.trim() || "Sans thème";
  return (
    <footer className={styles.footer}>
      Fiche n°{numero} · {themeLabel} · {dateLabel}
    </footer>
  );
}

export function WorksheetDocument({
  payload,
  numero,
  theme,
  dateLabel,
  illustrationSrc,
}: WorksheetDocumentProps) {
  const displayTheme = theme ?? payload.theme;
  const orderedSentences = [...payload.ordering.sentences].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className={styles.document}>
      {/* Page 1 — reading */}
      <article className={styles.page} data-page="1">
        <div className={styles.pageBody}>
          <div className={styles.column}>
            <h1 className={styles.title}>{payload.title}</h1>

            {illustrationSrc ? (
              // biome-ignore lint/performance/noImgElement: print asset URL; next/image not needed for Gotenberg
              <img
                className={styles.illustration}
                src={illustrationSrc}
                alt=""
              />
            ) : null}

            <p className={styles.text}>{payload.text}</p>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Vocabulaire</h2>
              <ul className={styles.vocabBox}>
                {payload.vocabulary.map((item) => (
                  <li key={item.term} className={styles.vocabItem}>
                    <span className={styles.term}>{item.term}</span>
                    {" : "}
                    {item.definition}
                    {" — "}
                    <span className={styles.example}>{item.example}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
        <PageFooter
          numero={numero}
          theme={displayTheme}
          dateLabel={dateLabel}
        />
      </article>

      {/* Page 2 — exercises */}
      <article className={styles.page} data-page="2">
        <div className={styles.pageBody}>
          <div className={styles.column}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Compréhension</h2>
              <ol className={styles.questions}>
                {payload.questions.map((question) => (
                  <li key={question.prompt} className={styles.questionBlock}>
                    <p className={styles.questionPrompt}>{question.prompt}</p>
                    <WritingLines count={LINE_COUNTS[question.type]} />
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Remise en ordre</h2>
              <ul className={styles.ordering}>
                {payload.ordering.sentences.map((sentence) => (
                  <li key={sentence.label} className={styles.orderingItem}>
                    <span className={styles.orderingBox} aria-hidden="true">
                      {sentence.label}.
                    </span>
                    <span className={styles.orderingText}>{sentence.text}</span>
                  </li>
                ))}
              </ul>

              <p className={styles.sequenceLabel}>Ordre final :</p>
              <div className={styles.sequenceBand} aria-hidden="true">
                {(["1", "2", "3", "4", "5", "6"] as const).map((slot, i) => (
                  <span key={slot} className={styles.sequenceCellGroup}>
                    <span className={styles.sequenceBox} />
                    {i < 5 ? (
                      <span className={styles.sequenceArrow}>→</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
        <PageFooter
          numero={numero}
          theme={displayTheme}
          dateLabel={dateLabel}
        />
      </article>

      {/* Page 3 — detachable answer key */}
      <article className={styles.page} data-page="3">
        <div className={styles.pageBody}>
          <div className={styles.column}>
            <header className={styles.detachHeader}>
              <p className={styles.detachTitle}>À détacher</p>
              <div className={styles.cutRule} aria-hidden="true" />
            </header>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Corrigé — Compréhension</h2>
              <ol className={styles.answerList}>
                {payload.questions.map((question, index) => (
                  <li key={question.prompt} className={styles.answerItem}>
                    <p className={styles.answerPrompt}>
                      <span className={styles.answerNumber}>{index + 1}.</span>{" "}
                      {question.prompt}
                    </p>
                    {question.type === "opinion" ? (
                      <ul className={styles.hints}>
                        {question.hints.map((hint) => (
                          <li key={hint}>{hint}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.answerText}>{question.answer}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Corrigé — Remise en ordre</h2>
              <ol className={styles.orderedSequence}>
                {orderedSentences.map((sentence) => (
                  <li key={sentence.label} className={styles.orderedItem}>
                    <span className={styles.label}>{sentence.label}.</span>{" "}
                    {sentence.text}
                  </li>
                ))}
              </ol>

              <h3 className={styles.rationaleTitle}>Pourquoi cet ordre ?</h3>
              <p className={styles.rationale}>{payload.ordering.rationale}</p>
            </section>
          </div>
        </div>
        <PageFooter
          numero={numero}
          theme={displayTheme}
          dateLabel={dateLabel}
        />
      </article>
    </div>
  );
}
