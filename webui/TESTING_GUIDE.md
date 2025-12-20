# Testing Guide for Barrister WebUI

This guide documents our approach to testing the web UI, focusing on behavior-driven testing patterns that catch real bugs and remain stable as implementation details change.

## The Problem: "Writing the Code Backwards"

We've identified an anti-pattern where tests validate implementation details rather than user-visible behavior. This leads to:

- Tests that don't catch bugs (missing redraws, incorrect data formats, broken interactions)
- Tests that break when bugs are fixed (requiring test updates to match correct behavior)
- Tests that couple tightly to implementation details (default values, internal method calls, state management)

### Example Anti-Pattern

```javascript
// ❌ BAD: Testing implementation details
it('should initialize form with default values', () => {
  MethodForm.initializeForm(vnode);
  expect(MethodForm.formValues.id).toBe(0); // Breaks when we fix bug!
  expect(MethodForm.formValues.name).toBe(''); // Implementation detail
});
```

This test:
- Doesn't catch bugs like missing placeholders
- Breaks when we change default values to null (to show placeholders)
- Tests internal state, not user-visible behavior

## Testing Principles

### 1. Test Behavior, Not Implementation

Focus on **what the user sees and experiences**, not how the code implements it.

**Bad**: Test that `initializeForm()` sets `formValues.id = 0`  
**Good**: Test that an integer input field appears with placeholder text "Enter integer" and empty value

**Bad**: Test that `m.redraw()` is called  
**Good**: Test that the loading spinner appears when state changes

### 2. Test User-Visible Outcomes

Test the DOM output, user interactions, and observable state changes.

```javascript
// ✅ GOOD: Test user-visible outcome
it('shows placeholder text for empty integer field', () => {
  const rendered = renderComponent(MethodForm, { method, ... });
  const input = findElement(rendered, 'input[type="number"]');
  expect(input.placeholder).toBe('Enter integer');
  expect(input.value).toBe(''); // Not 0!
});
```

### 3. Test Integration, Not Isolation

Test components as they're actually used, with real rendering and interactions.

**Bad**: Test component methods in isolation with mocked callbacks  
**Good**: Test component rendering and user interactions through DOM

### 4. Test Data Transformations

Verify that data flows correctly through the system and is transformed properly.

**Bad**: Test that internal variables are set  
**Good**: Test that form submission produces correct JSON-RPC request format with params as array

## Key Testing Patterns

### Pattern 1: Render and Assert DOM

Test that components render correctly by checking DOM structure and attributes.

```javascript
it('shows placeholder text for empty integer field', () => {
  const method = {
    name: 'testMethod',
    parameters: [
      { name: 'id', type: { builtIn: 'int' } }
    ]
  };
  
  const rendered = renderComponent(MethodForm, {
    method,
    typeRegistry: createMockRegistry(),
    formValues: {},
    onFormChange: vi.fn(),
    onSubmit: vi.fn()
  });
  
  const input = findElement(rendered, 'input[type="number"]');
  expect(input.placeholder).toBe('Enter integer');
  expect(input.value).toBe(''); // Empty, not 0
});
```

### Pattern 2: User Interaction Flow

Test user interactions and their effects on the UI and callbacks.

```javascript
it('calls onSubmit with form values when submit button clicked', () => {
  const onSubmit = vi.fn();
  const method = {
    name: 'testMethod',
    parameters: [
      { name: 'name', type: { builtIn: 'string' } }
    ]
  };
  
  const rendered = renderComponent(MethodForm, {
    method,
    typeRegistry: createMockRegistry(),
    formValues: {},
    onFormChange: vi.fn(),
    onSubmit
  });
  
  // User fills form
  const input = findElement(rendered, 'input[type="text"]');
  simulateInput(input, 'test value');
  
  // User submits
  const submitBtn = findElement(rendered, 'button');
  simulateClick(submitBtn);
  
  // Verify callback called with correct data
  expect(onSubmit).toHaveBeenCalled();
  const submittedValues = onSubmit.mock.calls[0][0];
  expect(submittedValues.name).toBe('test value');
});
```

### Pattern 3: State Change Outcomes

Test that UI updates correctly when state changes (especially async operations).

```javascript
it('shows loading indicator while discovering IDL', async () => {
  const discoverIDL = vi.fn(() => new Promise(resolve => 
    setTimeout(() => resolve({ interfaces: [] }), 100)
  ));
  
  // Mock the API module
  vi.doMock('../services/api.js', () => ({ discoverIDL }));
  
  const rendered = renderComponent(EndpointList, {
    currentEndpoint: null,
    onEndpointSelect: vi.fn()
  });
  
  // User adds endpoint
  const input = findElement(rendered, 'input[placeholder*="Endpoint URL"]');
  simulateInput(input, 'http://example.com');
  const addBtn = findElement(rendered, 'button');
  simulateClick(addBtn);
  
  // Verify loading indicator appears
  const loadingText = findElement(rendered, '*=Loading...');
  expect(loadingText).not.toBeNull();
});
```

### Pattern 4: Data Transformation Verification

Test that data is correctly transformed (e.g., object to array for JSON-RPC params).

```javascript
it('converts form values to array format for JSON-RPC params', async () => {
  const onSubmit = vi.fn(async (values) => {
    // Simulate what app.js does: convert to array
    const paramsArray = method.parameters.map(p => values[p.name]);
    return paramsArray;
  });
  
  const method = {
    name: 'add',
    parameters: [
      { name: 'a', type: { builtIn: 'int' } },
      { name: 'b', type: { builtIn: 'int' } }
    ]
  };
  
  const rendered = renderComponent(MethodForm, {
    method,
    typeRegistry: createMockRegistry(),
    onSubmit
  });
  
  // Fill form
  const inputs = rendered.querySelectorAll('input[type="number"]');
  simulateInput(inputs[0], '50');
  simulateInput(inputs[1], '10');
  
  // Submit
  const submitBtn = findElement(rendered, 'button');
  simulateClick(submitBtn);
  
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalled();
    const submittedValues = onSubmit.mock.calls[0][0];
    // Verify params would be converted to [50, 10] not {a: 50, b: 10}
    expect(submittedValues.a).toBe(50);
    expect(submittedValues.b).toBe(10);
  });
});
```

## Testing Utilities

We provide several utilities to make behavior-focused testing easier:

### `renderComponent(component, attrs, container)`

Renders a Mithril component to a DOM container, returning the container for querying.

```javascript
const container = renderComponent(MethodForm, {
  method: myMethod,
  typeRegistry: registry,
  onSubmit: handleSubmit
});
```

### `findElement(container, selector)`

Finds an element with helpful error messages. Supports CSS selectors and text matching.

```javascript
const input = findElement(container, 'input[type="text"]');
const loadingText = findElement(container, '*=Loading...'); // Text content match
```

### `waitForElement(container, selector, timeout)`

Waits for an element to appear (useful for async updates).

```javascript
const spinner = await waitForElement(container, '.spinner', 2000);
```

### Event Simulation

- `simulateClick(element)` - Simulate a click event
- `simulateInput(element, value)` - Simulate input with value
- `simulateChange(element, value)` - Simulate change event

## What to Test vs. What Not to Test

### ✅ DO Test

- User-visible UI elements and their properties
- User interactions (clicks, inputs, form submissions)
- Data transformations (object → array, formatting)
- Async operations and their UI feedback
- Error states and error messages
- Component integration and data flow

### ❌ DON'T Test

- Internal state variables (unless they affect user-visible behavior)
- Implementation details (default values, method calls)
- Framework-specific mechanisms (m.redraw(), lifecycle hooks)
- Third-party library internals
- Code that's already tested by framework/library tests

## Example: Refactoring a Test

### Before (Implementation-Focused)

```javascript
it('should initialize form with default values', () => {
  MethodForm.oninit(vnode);
  MethodForm.initializeForm(vnode);
  
  expect(MethodForm.formValues.id).toBe(0); // Implementation detail
  expect(MethodForm.formValues.name).toBe(''); // Implementation detail
});
```

**Problems:**
- Tests internal state
- Breaks when we fix bug (change defaults to null for placeholders)
- Doesn't verify user sees correct UI

### After (Behavior-Focused)

```javascript
it('shows empty input fields with placeholders for method parameters', () => {
  const method = {
    name: 'add',
    parameters: [
      { name: 'id', type: { builtIn: 'int' } },
      { name: 'name', type: { builtIn: 'string' } }
    ]
  };
  
  const rendered = renderComponent(MethodForm, {
    method,
    typeRegistry: createMockRegistry(),
    formValues: {},
    onFormChange: vi.fn(),
    onSubmit: vi.fn()
  });
  
  const intInput = findElement(rendered, 'input[type="number"]');
  const stringInput = findElement(rendered, 'input[type="text"]');
  
  expect(intInput.placeholder).toBe('Enter integer');
  expect(intInput.value).toBe(''); // Empty, not 0
  expect(stringInput.placeholder).toBe('Enter string');
  expect(stringInput.value).toBe('');
});
```

**Benefits:**
- Tests what user sees
- Won't break when implementation changes
- Actually catches bugs (missing placeholders, wrong default values)

## Integration Tests

For complex flows, write integration tests that exercise multiple components together:

```javascript
it('full flow: add endpoint → select method → fill form → submit', async () => {
  // Test the entire user workflow
  // This catches integration issues that unit tests miss
});
```

See `src/integration/component-integration.test.js` for examples.

## Continuous Improvement

When you find a bug that tests didn't catch:

1. Write a behavior-focused test that would have caught it
2. Verify the test fails with the bug present
3. Fix the bug
4. Verify the test passes

This ensures we're always improving our test coverage of real user scenarios.

