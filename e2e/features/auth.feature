Feature: Authentication
  As a student
  I want to create an account and sign in
  So that I can access my personal study dashboard

  Background:
    Given I am on the StudySprint home page

  Scenario: Successful registration with valid credentials
    When I navigate to the registration page
    And I enter the email "e2e_test@example.com" and password "password123"
    And I submit the registration form
    Then I should be redirected to the dashboard
    And I should see my study goals listed

  Scenario: Registration fails when password is too short
    When I navigate to the registration page
    And I enter the email "short@example.com" and password "abc"
    And I submit the registration form
    Then I should see the error "Password must be at least 6 characters"
    And I should remain on the registration page

  Scenario: Successful login with existing credentials
    Given a registered account with email "demo@example.com" and password "demo123"
    When I enter the email "demo@example.com" and password "demo123" on the login form
    And I click Sign in
    Then I should be redirected to the dashboard

  Scenario: Login fails with wrong password
    Given a registered account with email "demo@example.com" and password "demo123"
    When I enter the email "demo@example.com" and password "wrongpassword" on the login form
    And I click Sign in
    Then I should see an error message on the login page
    And I should remain on the home page
