import styles from "./styles.module.css";

export default function AboutContainer() {
  return (
    <main className={styles.about}>
      <h1>About Exile Leveling Overlay</h1>
      <p>
        A Windows overlay fork of HeartofPhos&apos;s Exile Leveling guide. It
        follows Path of Exile 1 campaign progress by reading area transitions
        from the local <code>LatestClient.txt</code> log.
      </p>

      <section
        className={styles.notice}
        aria-label="Grinding Gear Games notice"
      >
        <strong>Grinding Gear Games notice</strong>
        <p>
          This product isn&apos;t affiliated with or endorsed by Grinding Gear
          Games in any way.
        </p>
      </section>

      <h2>Privacy and safety</h2>
      <p>
        Log reading happens locally and is inactive unless auto-progress is
        enabled. Only generated-area records are sent to the dashboard. The app
        does not read game memory, inject into the game, automate input, or
        collect telemetry.
      </p>

      <h2>Credits and licenses</h2>
      <ul>
        <li>
          Original guide and route project:{" "}
          <a
            href="https://github.com/HeartofPhos/exile-leveling"
            target="_blank"
            rel="noreferrer"
          >
            HeartofPhos/exile-leveling
          </a>
        </li>
        <li>
          Log-tail implementation adapted with permission from{" "}
          <a
            href="https://github.com/HeartofPhos/exile-log-api"
            target="_blank"
            rel="noreferrer"
          >
            HeartofPhos/exile-log-api
          </a>
          .
        </li>
        <li>
          This fork is distributed under the MIT License. Bundled third-party
          notices are included with every installer.
        </li>
      </ul>

      <p>
        <a
          href="https://github.com/NloonF/exile-leveling-overlay"
          target="_blank"
          rel="noreferrer"
        >
          Source code, releases, and issue tracker
        </a>
      </p>
    </main>
  );
}
