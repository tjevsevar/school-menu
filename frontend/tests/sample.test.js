/**
 * Sample test file to verify Jest is working correctly.
 */

test('basic math works', () => {
    expect(2 + 2).toBe(4);
});

test('string concatenation works', () => {
    expect('hello' + ' world').toBe('hello world');
});

test('array operations work', () => {
    const testArray = [1, 2, 3];
    testArray.push(4);
    expect(testArray).toHaveLength(4);
    expect(testArray).toContain(4);
});

test('object properties work', () => {
    const testObject = {
        name: 'School Lunch Checker',
        version: '1.0.0'
    };
    expect(testObject.name).toBe('School Lunch Checker');
    expect(testObject).toHaveProperty('version');
});

describe('DOM-like operations', () => {
    test('can create mock DOM elements', () => {
        // Mock a simple DOM element
        const mockElement = {
            textContent: 'Hello World',
            className: 'test-class'
        };
        
        expect(mockElement.textContent).toBe('Hello World');
        expect(mockElement.className).toBe('test-class');
    });
    
    test('can mock fetch-like operations', () => {
        const mockApiResponse = {
            success: true,
            menu: 'Test menu content',
            timestamp: '2025-09-25T12:00:00Z'
        };
        
        expect(mockApiResponse.success).toBe(true);
        expect(mockApiResponse.menu).toBe('Test menu content');
        expect(mockApiResponse).toHaveProperty('timestamp');
    });
});
