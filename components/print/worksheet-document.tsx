import type { FichePayload, QuestionType } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import styles from "./worksheet.module.css";

type WorksheetDocumentProps = {
  payload: FichePayload;
  numero: number;
  theme: string | null;
  dateLabel: string;
  illustrationSrc?: string | null;
  /** Hand-edited field paths — outlines only when provided (preview). */
  editedFields?: ReadonlySet<string>;
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
  themeEdited,
}: {
  numero: number;
  theme: string | null;
  dateLabel: string;
  themeEdited?: boolean;
}) {
  const themeLabel = theme?.trim() || "Sans thème";
  return (
    <footer className={styles.footer}>
      Fiche n°{numero} ·{" "}
      <span className={themeEdited ? styles.edited : undefined}>
        {themeLabel}
      </span>{" "}
      · {dateLabel}
    </footer>
  );
}

export function WorksheetDocument({
  payload,
  numero,
  theme,
  dateLabel,
  illustrationSrc,
  editedFields,
}: WorksheetDocumentProps) {
  const displayTheme = theme ?? payload.theme;
  const themeEdited = Boolean(editedFields?.has("theme"));
  const orderedSentences = [...payload.ordering.sentences].sort(
    (a, b) => a.position - b.position,
  );
  const isEdited = (path: string) => Boolean(editedFields?.has(path));

  return (
    <div className={styles.document}>
      {/* Page 1 — reading */}
      <article className={styles.page} data-page="1">
        <div className={styles.pageBody}>
          <div className={styles.column}>
            <h1
              className={cn(styles.title, isEdited("title") && styles.edited)}
            >
              {payload.title}
            </h1>

            {illustrationSrc ? (
              // biome-ignore lint/performance/noImgElement: print asset URL; next/image not needed for Gotenberg
              <img
                className={styles.illustration}
                src={illustrationSrc}
                alt=""
              />
            ) : null}

            <p className={cn(styles.text, isEdited("text") && styles.edited)}>
              {payload.text}
            </p>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Vocabulaire</h2>
              <ul className={styles.vocabBox}>
                {payload.vocabulary.map((item, index) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 vocab slots
                    key={index}
                    className={styles.vocabItem}
                  >
                    <span
                      className={cn(
                        styles.term,
                        isEdited(`vocabulary.${index}.term`) && styles.edited,
                      )}
                    >
                      {item.term}
                    </span>
                    {" : "}
                    <span
                      className={
                        isEdited(`vocabulary.${index}.definition`)
                          ? styles.edited
                          : undefined
                      }
                    >
                      {item.definition}
                    </span>
                    {" — "}
                    <span
                      className={cn(
                        styles.example,
                        isEdited(`vocabulary.${index}.example`) &&
                          styles.edited,
                      )}
                    >
                      {item.example}
                    </span>
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
          themeEdited={themeEdited}
        />
      </article>

      {/* Page 2 — exercises */}
      <article className={styles.page} data-page="2">
        <div className={styles.pageBody}>
          <div className={styles.column}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Compréhension</h2>
              <ol className={styles.questions}>
                {payload.questions.map((question, index) => (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 question slots
                    key={index}
                    className={styles.questionBlock}
                  >
                    <p
                      className={cn(
                        styles.questionPrompt,
                        isEdited(`questions.${index}.prompt`) && styles.edited,
                      )}
                    >
                      {question.prompt}
                    </p>
                    <WritingLines count={LINE_COUNTS[question.type]} />
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Remise en ordre</h2>
              <ul className={styles.ordering}>
                {payload.ordering.sentences.map((sentence, index) => (
                  <li key={sentence.label} className={styles.orderingItem}>
                    <span className={styles.orderingBox} aria-hidden="true">
                      {sentence.label}.
                    </span>
                    <span
                      className={cn(
                        styles.orderingText,
                        isEdited(`ordering.sentences.${index}.text`) &&
                          styles.edited,
                      )}
                    >
                      {sentence.text}
                    </span>
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
          themeEdited={themeEdited}
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
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 question slots
                    key={index}
                    className={styles.answerItem}
                  >
                    <p
                      className={cn(
                        styles.answerPrompt,
                        isEdited(`questions.${index}.prompt`) && styles.edited,
                      )}
                    >
                      <span className={styles.answerNumber}>{index + 1}.</span>{" "}
                      {question.prompt}
                    </p>
                    {question.type === "opinion" ? (
                      <ul className={styles.hints}>
                        {question.hints.map((hint, hi) => (
                          <li
                            // biome-ignore lint/suspicious/noArrayIndexKey: hint slot within fixed question
                            key={hi}
                            className={
                              isEdited(`questions.${index}.hints.${hi}`)
                                ? styles.edited
                                : undefined
                            }
                          >
                            {hint}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p
                        className={cn(
                          styles.answerText,
                          isEdited(`questions.${index}.answer`) &&
                            styles.edited,
                        )}
                      >
                        {question.answer}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Corrigé — Remise en ordre</h2>
              <ol className={styles.orderedSequence}>
                {orderedSentences.map((sentence) => {
                  const originalIndex = payload.ordering.sentences.findIndex(
                    (s) => s.label === sentence.label,
                  );
                  const marked =
                    isEdited(`ordering.sentences.${originalIndex}.text`) ||
                    isEdited(`ordering.sentences.${originalIndex}.position`);
                  return (
                    <li
                      key={sentence.label}
                      className={cn(
                        styles.orderedItem,
                        marked && styles.edited,
                      )}
                    >
                      <span className={styles.label}>{sentence.label}.</span>{" "}
                      {sentence.text}
                    </li>
                  );
                })}
              </ol>

              <h3 className={styles.rationaleTitle}>Pourquoi cet ordre ?</h3>
              <p
                className={cn(
                  styles.rationale,
                  isEdited("ordering.rationale") && styles.edited,
                )}
              >
                {payload.ordering.rationale}
              </p>
            </section>
          </div>
        </div>
        <PageFooter
          numero={numero}
          theme={displayTheme}
          dateLabel={dateLabel}
          themeEdited={themeEdited}
        />
      </article>
    </div>
  );
}
