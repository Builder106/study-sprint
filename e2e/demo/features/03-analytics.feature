Feature: Demo — Analytics and study charge
  Walk through the analytics dashboard and the charge-based study view.

  Background:
    Given I am logged in as "demo@studysprint.app" with password "demo123"

  Scenario: Demonstrate analytics heatmap and study charge
    When I navigate to the analytics page
    Then I should see the contribution heatmap
    When I navigate to the study charge page
    Then I should see the XP bar
    And I should see the battery charge
