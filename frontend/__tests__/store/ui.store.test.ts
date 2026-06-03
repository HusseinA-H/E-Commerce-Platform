import { useUIStore } from '@/store';

describe('UI Store', () => {
  beforeEach(() => {
    // Reset state before each test
    useUIStore.setState({
      isAISearchOpen: false,
      isAIStylistOpen: false,
    });
  });

  it('should have initial state', () => {
    const state = useUIStore.getState();
    expect(state.isAISearchOpen).toBe(false);
    expect(state.isAIStylistOpen).toBe(false);
  });

  it('should toggle AI Search open and close', () => {
    useUIStore.getState().openAISearch();
    expect(useUIStore.getState().isAISearchOpen).toBe(true);

    useUIStore.getState().closeAISearch();
    expect(useUIStore.getState().isAISearchOpen).toBe(false);
  });

  it('should toggle AI Stylist open and close', () => {
    useUIStore.getState().openAIStylist();
    expect(useUIStore.getState().isAIStylistOpen).toBe(true);

    useUIStore.getState().closeAIStylist();
    expect(useUIStore.getState().isAIStylistOpen).toBe(false);
  });
});
