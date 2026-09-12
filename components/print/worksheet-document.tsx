import type { FichePayload } from "@/lib/schemas";
import styles from "./worksheet.module.css";

type WorksheetDocumentProps = {
  payload: FichePayload;
};

export function WorksheetDocument({ payload }: WorksheetDocumentProps) {
  return (
    <article className={styles.page}>
      <div className={styles.column}>
        <h1 className={styles.title}>{payload.title}</h1>

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

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Compréhension</h2>
          <ol className={styles.questions}>
            {payload.questions.map((question) => (
              <li key={question.prompt} className={styles.question}>
                {question.prompt}
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Remise en ordre</h2>
          <ul className={styles.ordering}>
            {payload.ordering.sentences.map((sentence) => (
              <li key={sentence.label} className={styles.orderingItem}>
                <span className={styles.label}>{sentence.label}.</span>{" "}
                {sentence.text}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
