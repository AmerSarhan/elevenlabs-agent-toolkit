# Prompt Review Checklist

Use after writing or updating your agent prompt.

## Structure

- [ ] Identity section is first (who the agent is)
- [ ] Rules section is second (what to do/not do)
- [ ] Knowledge section is last (facts and data)
- [ ] Critical rules are in the first 2000 characters
- [ ] No contradicting instructions

## Voice Readability

- [ ] Read the entire prompt aloud -- does it make sense as speech?
- [ ] No bullet points or numbered lists in agent responses
- [ ] No URLs, email addresses, or complex strings to speak
- [ ] Numbers are written as words where appropriate
- [ ] Abbreviations have pronunciation guidance
- [ ] No "Based on the information provided" or similar filler

## Conversation Flow

- [ ] Agent knows how to open the conversation
- [ ] Agent knows how to handle silence
- [ ] Agent knows how to handle "I don't know" or confusion
- [ ] Agent knows when to escalate to a human
- [ ] Agent knows how to end the call gracefully
- [ ] Agent never asks for information it already has
- [ ] Agent never asks for "full name" (use "What's your name?")

## Safety

- [ ] Agent refuses off-topic requests politely
- [ ] Agent doesn't make promises it can't keep
- [ ] Agent doesn't share internal system information
- [ ] Agent handles profanity/abuse gracefully
- [ ] No prompt injection vulnerabilities

## Dynamic Variables

- [ ] All {{variables}} referenced in prompt are provided by webhook or config
- [ ] Fallback behavior defined for missing variables
- [ ] Variable names are consistent across prompt and webhook
