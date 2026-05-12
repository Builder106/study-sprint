Feature: Account settings — change password
  As a signed-in user
  I want to change my password from settings
  So that I can keep my account secure

  Background:
    Given I am logged in as "demo-settings@studysprint.app" with password "demo123"
    And I navigate to the settings page

  Scenario: Successful password change with valid credentials
    When I enter the current password "demo123", new password "demo123-new", and confirmation "demo123-new"
    And I submit the password change form
    Then I should see the toast "Password updated."
    And my password is restored to "demo123" via admin

  Scenario: Password change fails when current password is wrong
    When I enter the current password "wrongpass", new password "demo123-new", and confirmation "demo123-new"
    And I submit the password change form
    Then I should see the error "Current password is incorrect."
    And I should remain on the settings page

  Scenario: Password change fails when new passwords don't match
    When I enter the current password "demo123", new password "demo123-new", and confirmation "demo123-other"
    And I submit the password change form
    Then I should see the error "New passwords don't match."
    And I should remain on the settings page

  Scenario: Password change fails when new password is too short
    When I enter the current password "demo123", new password "abc", and confirmation "abc"
    And I submit the password change form
    Then I should see the error "Password must be at least 8 characters."
    And I should remain on the settings page

  Scenario: Password change fails when new password is too common
    When I enter the current password "demo123", new password "qwerty123", and confirmation "qwerty123"
    And I submit the password change form
    Then I should see the error "That password is too common — try something less guessable."
    And I should remain on the settings page
