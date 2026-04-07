// __tests__/lib/openweather.test.ts
global.fetch = jest.fn()

import { fetchForecast } from '../../lib/openweather'

describe('fetchForecast', () => {
  it('returns parsed forecast days', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: [
          { dt_txt: '2026-05-01 12:00:00', main: { temp_min: 15, temp_max: 22 }, weather: [{ description: 'clear sky', icon: '01d' }] },
          { dt_txt: '2026-05-02 12:00:00', main: { temp_min: 13, temp_max: 20 }, weather: [{ description: 'light rain', icon: '10d' }] },
        ],
      }),
    })

    const result = await fetchForecast('Rome', '2026-05-01', '2026-05-05')
    expect(result).toHaveLength(2)
    expect(result[0].description).toBe('clear sky')
    expect(result[0].temp_max).toBe(22)
  })
})
