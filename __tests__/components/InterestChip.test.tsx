// __tests__/components/InterestChip.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { InterestChip } from '../../components/InterestChip'

describe('InterestChip', () => {
  it('renders label and emoji', () => {
    const { getByText } = render(
      <InterestChip label="Culture" emoji="🏛" selected={false} onPress={() => {}} />
    )
    expect(getByText('🏛 Culture')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <InterestChip label="Food" emoji="🍜" selected={false} onPress={onPress} />
    )
    fireEvent.press(getByText('🍜 Food'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
