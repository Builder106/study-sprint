Feature: UI tour — the charging loop
  # Tier 2 raw footage source for ui-demo/. Recorded via `npm run tour` /
  # `npm run tour:light` (playwright.tour.config.ts), not `deno task demo`.
  #
  # Requires `deno task test:setup && deno task seed:demo` to have already
  # run — this scenario logs a real 90-minute, quality-5 session against the
  # demo account, and e2e/setup/seed-demo-history.ts seeds total XP so that
  # exact session raises the visible study charge on camera. Re-seed between
  # dark and light passes because this scenario mutates state.

  Scenario: A day's worth of sessions keeps the charge alive
    Given I am logged in as "demo@studysprint.app" with password "demo123"

    # Beat 1 — the hook: open on the payoff, not a login screen.
    When I navigate to the study charge page
    Then I should see the battery charge
    And I should see the XP bar

    # Beat 2 — the unit: one timer, two modes.
    When I navigate to the goal titled "CS 201: Data Structures & Algorithms"
    And I click the "Pomodoro" mode button on the timer
    Then the timer should show the "Focus" phase label
    And the timer display should show "25:00"
    When I click the "Stopwatch" mode button on the timer
    And I click the Start button on the timer
    Then the timer should be running

    # Beat 3 — the log: this exact session (90min, Mastered) is what the
    # seeder's XP target is tuned against.
    When I open the log session modal
    And I set the session duration to "1.5"
    And I rate the session "Mastered"
    And I save the session
    Then the session modal should close
    And I should see the session in the recent sessions list

    # Beat 4 — the record: the session lands somewhere visible.
    When I navigate to the analytics page
    Then I should see the contribution heatmap

    # Beat 5 — the payoff: the charge rises on camera from the session logged
    # two beats ago.
    When I navigate to the study charge page
    Then I should see the battery charge
    And I should see the achievements grid

    # Beat 6 — the shortcut: a stubbed syllabus-parse response, since the
    # real edge function calls a live LLM with no offline/mock path.
    Given the syllabus parser is stubbed with 3 suggested goals
    When I open the syllabus import modal
    And I paste syllabus text
    And I click the Suggest goals button
    Then I should see the suggested goals
    When I create the suggested goals
    Then the syllabus import modal should not be visible

    # Beat 7 — the room: populated leaderboard, then a real room's members
    # and activity feed.
    When I navigate to the community page
    Then I should see the weekly leaderboard
    When I open my study room
    Then I should see the room members list
    And I should see the room activity feed
