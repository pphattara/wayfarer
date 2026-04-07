import { lightPalette, darkPalette } from '../../hooks/useTheme'

describe('useTheme palettes', () => {
  describe('light palette', () => {
    it('has correct background color', () => {
      expect(lightPalette.background).toBe('#ffffff')
    })

    it('has correct text color', () => {
      expect(lightPalette.text).toBe('#1a1a18')
    })

    it('has correct tab bar color', () => {
      expect(lightPalette.tabBar).toBe('#ffffff')
    })

    it('has correct primary color', () => {
      expect(lightPalette.primary).toBe('#0F6E56')
    })

    it('has correct muted color', () => {
      expect(lightPalette.muted).toBe('#9b9b96')
    })
  })

  describe('dark palette', () => {
    it('has correct background color', () => {
      expect(darkPalette.background).toBe('#0d0d0d')
    })

    it('has correct text color', () => {
      expect(darkPalette.text).toBe('#f0f0ee')
    })

    it('has correct tab bar color', () => {
      expect(darkPalette.tabBar).toBe('#111111')
    })

    it('has correct primary color', () => {
      expect(darkPalette.primary).toBe('#1DB984')
    })

    it('has correct muted color', () => {
      expect(darkPalette.muted).toBe('#6b6b66')
    })
  })
})
