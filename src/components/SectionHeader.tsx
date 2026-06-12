import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { palette, spacing, typography } from '@/themes';

export type SectionHeaderProps = {
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, description, trailing, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.title,
    color: palette.textPrimary,
  },
  description: {
    ...typography.body,
    color: palette.textSecondary,
  },
  trailing: {
    marginLeft: spacing.sm,
  },
});
