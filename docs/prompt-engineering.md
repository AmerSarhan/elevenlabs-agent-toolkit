# Prompt Engineering for Voice Agents

Voice prompts are fundamentally different from text prompts. What reads well on screen often sounds terrible when spoken aloud. This guide covers how to write prompts that produce natural, effective voice conversations.

## Voice vs Text: Why It Matters

Text-based LLM interactions are visual. The user reads at their own pace, re-reads confusing parts, and scans for key information. Voice is linear and ephemeral — the caller hears each word once, in real time, and can't scroll back.

This changes everything about how you write prompts:

| Text prompt patterns | Voice prompt patterns |
|---------------------|----------------------|
| "Please provide your full name" | "What's your name?" |
| "Here are your options: 1) ... 2) ... 3) ..." | "You've got a couple of options. The first is..." |
| "Based on the information you've provided, it appears that..." | "Got it — here's what I found." |
| "I apologize for the inconvenience. Let me..." | "Sorry about that. Let me..." |
| Long, detailed paragraphs | Short, conversational sentences |

**The test**: Read your agent's responses out loud. If it sounds like a robot reading a legal document, rewrite it.

## The 3-Section Prompt Structure

Every effective voice agent prompt follows three sections, in this order:

```
[Identity]     → Who the agent is
[Rules]        → How the agent behaves
[Knowledge]    → What the agent knows
```

Order matters. The LLM weights earlier instructions more heavily. Put the most critical behavioral rules near the top.

## Section 1: Identity

Define who the agent is in 3-5 sentences. This anchors the LLM's tone and behavior for the entire conversation.

**Bad:**
```
You are an AI assistant created to help customers with their inquiries
regarding products and services offered by TechCorp Inc.
```

**Good:**
```
You are Sarah, a friendly customer support agent at TechCorp.
You speak casually but professionally — like a knowledgeable colleague, not a script-reader.
You keep responses short and to the point. If you don't know something, you say so and offer to connect the caller with someone who does.
```

### What to include in Identity

- **Name**: Always give your agent a name. Callers will ask.
- **Personality**: 2-3 adjectives that define the speaking style (friendly, direct, patient, upbeat).
- **Speaking style**: Short sentences vs long? Formal vs casual? Uses filler words ("sure", "absolutely") or not?
- **Role boundaries**: What the agent does and does not handle. "You only handle billing questions. For technical issues, transfer to tech support."

## Section 2: Rules

Rules govern the agent's behavior during conversation. Split them into positive rules (do this) and negative rules (never do this).

**Good rules section:**
```
## Rules

### Always
- Greet the caller by name if you know it: "Hi {{caller_name}}, how can I help?"
- Confirm you understood before taking action: "So you want to cancel your subscription — is that right?"
- Keep responses under 2-3 sentences unless the caller asks for detail
- If the caller seems frustrated, acknowledge it: "I hear you, that's frustrating. Let me fix this."

### Never
- Never say "as an AI" or "as a language model"
- Never read out URLs, email addresses character by character, or long reference numbers — offer to send them via text instead
- Never ask for information you already have from the dynamic variables
- Never transfer a call without telling the caller why and where they're going
- Never make up information. If unsure, say "Let me check on that" and use the lookup tool
```

### Conversation flow rules

For agents that follow a specific flow (qualification, surveys, scheduling), define the steps explicitly:

```
## Conversation Flow
1. Greet the caller and confirm their name
2. Ask what they need help with
3. If it's a billing issue, look up their account using the account_lookup tool
4. Present the information and ask if that resolves their question
5. If not, offer to transfer to a specialist
6. Before ending, ask "Is there anything else I can help with?"
```

## Section 3: Knowledge

Business-specific facts the agent needs to do its job. This section is essentially a mini knowledge base embedded in the prompt.

```
## Knowledge

### Business Hours
- Monday-Friday: 9am-6pm EST
- Saturday: 10am-2pm EST
- Sunday: Closed
- Holiday closures: Check the schedule tool

### Plans
- Starter: $29/month, 100 calls, basic features
- Pro: $99/month, 1000 calls, all features, priority support
- Enterprise: Custom pricing, unlimited calls, dedicated account manager

### Common Policies
- Refunds: Full refund within 30 days, prorated after
- Cancellation: Effective at end of billing cycle, no early termination fee
- Upgrades: Prorated immediately, downgrades at next billing cycle
```

Keep knowledge factual and scannable. The LLM needs to find and reference this quickly during conversation.

## Common Mistakes

### 1. Asking for "full name"

**Bad**: "Can I have your full name, please?"
This sounds like filling out a government form. Real humans don't say "full name."

**Good**: "What's your name?" or "And who am I speaking with?"

If you need both first and last name, the agent will naturally get it. If someone says "Mike," the agent can say "Mike — and your last name?"

### 2. Using bullet points in speech

**Bad prompt instruction**: "List the three plan options with their features."
This produces: "Option one: Starter plan at twenty-nine dollars per month with one hundred calls and basic features. Option two: Pro plan at..."

**Good prompt instruction**: "Briefly describe the plan that best fits what the caller described. Only mention other plans if they ask."

Nobody wants to hear a menu read aloud. Recommend, don't enumerate.

### 3. Over-qualifying responses

**Bad**: "Based on the information you've provided and after reviewing your account details, it appears that your current subscription is on the Pro plan."

**Good**: "You're on the Pro plan."

Voice agents should sound confident and direct. Cut the preamble.

### 4. Asking for information the agent already has

If the pre-call webhook injected `{{caller_name}}` and `{{account_status}}`, the agent should never ask "What's your name?" or "Can I have your account number?"

Add an explicit rule:
```
You already know the caller's name ({{caller_name}}) and account status ({{account_status}}).
Do not ask for this information — use it naturally.
If a variable is empty, then and only then should you ask for it.
```

### 5. Not handling "I don't know"

Callers say "I don't know" more than you expect. If your agent isn't coached on how to handle it, the conversation stalls.

```
If the caller doesn't know their account number, offer alternatives:
"No problem — I can look you up by the email address on your account. What email would that be?"
```

### 6. Monologuing

**Bad**: Prompt instructions that produce 4+ sentence responses.

**Good**: Force brevity:
```
Keep every response under 3 sentences unless the caller explicitly asks for more detail.
When explaining something complex, pause and check in: "Does that make sense so far?"
```

### 7. Sounding too eager

**Bad**: "Absolutely! I'd be more than happy to help you with that! Great question!"

**Good**: "Sure, let me pull that up." or "Yeah, I can help with that."

Tone down enthusiasm in your identity section. Natural conversation isn't peppy.

## Dynamic Variables

Use `{{variable_name}}` in your prompt to reference values injected by the pre-call webhook or set in the agent config.

```
You are Sarah, a support agent at TechCorp.
The caller's name is {{caller_name}}.
Their account is {{account_status}}.
They have {{open_ticket_count}} open support tickets.

{{#if caller_context}}
Previous interaction notes: {{caller_context}}
{{/if}}
```

### Tips for dynamic variables

- **Always handle missing values**. If `{{caller_name}}` isn't set, your prompt should still make sense. Add a rule: "If you don't know the caller's name, ask for it naturally."
- **Don't over-inject**. Only inject what the agent actually needs for the conversation. Injecting 20 variables clutters the prompt and confuses the LLM.
- **Keep values concise**. Don't inject a 500-word case history — summarize to 2-3 sentences.

## Prompt Length Guidelines

- **Target**: Under 15,000 characters. Beyond this, the LLM takes longer to process and is more likely to ignore instructions buried deep in the prompt.
- **Front-load**: Put Identity and critical Rules in the first 3,000 characters.
- **Knowledge at the end**: Knowledge is referenced on-demand, so it can go at the bottom.
- **If your prompt exceeds 15K chars**, move detailed knowledge into a tool. Instead of embedding a full product catalog in the prompt, let the agent call a `product_lookup` tool.

## Bad vs Good: Full Examples

### Bad prompt (excerpt)

```
You are an AI-powered customer service representative designed to assist callers
with inquiries related to their accounts, billing, technical support, and general
information about our company's products and services. You should always maintain
a professional demeanor and provide accurate information based on the knowledge
base provided below. If you are unable to answer a question, please inform the
caller that you will escalate their inquiry to a human representative.

When a caller asks about their account, please request their full name, account
number, and the email address associated with their account for verification
purposes before proceeding with any account-related inquiries.
```

**Problems**: Reads like a policy document. Says "AI-powered." Asks for three pieces of verification info upfront (interrogation). Vague behavioral instructions.

### Good prompt (excerpt)

```
You are Maya, a support agent at Northwind. You're friendly, direct, and you
don't waste people's time.

## Rules
- If you know the caller's name from {{caller_name}}, use it right away:
  "Hey {{caller_name}}, what can I do for you?"
- If you don't have their name, just ask: "What's your name?"
- Look up their account using the account_lookup tool — don't ask them for
  an account number unless the lookup fails
- Keep responses to 1-2 sentences. The caller didn't call to listen to speeches.
- If you can't solve something, say so: "This one's beyond what I can fix on
  my end. Let me get you to someone who can." Then transfer.
- Never say you're an AI. If asked, say "I'm Maya from Northwind support."
```

**Why it works**: Has a name and personality. Uses dynamic variables. Doesn't interrogate. Has clear, actionable rules. Sounds like a person.

## Testing Prompts

Before deploying, test with real calls (or the ElevenLabs test call feature). Listen for:

1. **First impression**: Does the greeting sound natural? Is it the right length?
2. **Pacing**: Is the agent talking too much per turn? Callers should speak more than the agent.
3. **Recovery**: What happens when you say something unexpected, go off-topic, or say "I don't know"?
4. **Accuracy**: Does the agent use the knowledge section correctly? Does it make things up?
5. **Handoffs**: If the agent can't help, does it handle the transition smoothly?
6. **Name usage**: Does the agent use the caller's name naturally (once or twice), or does it overuse it (every sentence)?
7. **Ending**: Does the call end cleanly, or does it trail off?

### Testing checklist

- [ ] Call as a brand-new customer with no history
- [ ] Call as a returning customer (with pre-call webhook data)
- [ ] Ask something completely off-topic
- [ ] Give one-word answers and see if the agent adapts
- [ ] Interrupt the agent mid-sentence
- [ ] Say "I don't know" when asked a question
- [ ] Ask the agent what its name is
- [ ] Ask the agent if it's a robot/AI
- [ ] Test with background noise
- [ ] Test with a long pause (10+ seconds of silence)
