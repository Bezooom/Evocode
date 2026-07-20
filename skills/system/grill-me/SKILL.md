---
name: grill-me
domain: general
pack: general
tier: optional
triggers:
  - стресс-тест плана через вопросы
  - опроси меня по плану
  - интервью по дизайну
  - stress-test plan
  - decision tree
  - grill me
description: |
  [RU] Интервью пользователя по плану/дизайну до полного совместного понимания, разрешая каждую ветвь дерева решений. Используй когда пользователь хочет стресс-тест плана, ждёт жёстких вопросов по дизайну или говорит "grill me", "опроси меня".
  [EN] Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# Grill Me

Push through every branch of the decision tree with the user until reaching shared understanding. No hand-waving.

## Process

### 1. Identify the core decision

Start by restating the user's plan/design in your own words.

### 2. Grill by category

Work through these categories. Don't skip any:

- **Architecture**: "Why this approach? What are you giving up?"
- **Data**: "How does data flow? What gets persisted? What's the schema?"
- **APIs**: "What does the interface look like? What's the contract?"
- **Edge cases**: "What about X when Y? What about errors?"
- **Performance**: "What scales? What doesn't?"
- **Security**: "What could go wrong? What are the attack vectors?"
- **Testing**: "How would you test this?"

### 3. Push on weak spots

When the user gives a vague answer:
- "What exactly do you mean by X?"
- "Can you give me a concrete example?"
- "Walk me through that edge case."
- "Why not Y instead?"

### 4. Resolve, don't leave loose ends

Keep asking until each point is resolved. Don't move on until you understand.

### 5. Summarize

At the end, present a summary of all decisions made.

## Tips

- Be aggressive but not annoying. The goal is shared understanding, not proving you're right.
- Push on assumptions. "You mentioned X. Is that a requirement or a preference?"
- Ask about alternatives: "Did you consider Y? Why not?"
- Use concrete examples: "If I had a user with 10,000 items, what happens?"
