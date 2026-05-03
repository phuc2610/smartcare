import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Medical Disclaimer Footer
 * Shared component for displaying medical reference disclaimer
 */
export const MedicalDisclaimer = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nguồn tham khảo y khoa</Text>
      <Text style={styles.body}>
        Thông tin y tế trong ứng dụng chỉ mang tính tham khảo, không thay thế cho tư vấn, chẩn đoán hoặc điều trị y khoa chuyên nghiệp.
      </Text>
      <Text style={styles.body}>
        Luôn tham khảo ý kiến bác sĩ hoặc nhà cung cấp dịch vụ y tế có trình độ về bất kỳ câu hỏi nào liên quan đến tình trạng sức khỏe của bạn.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A5F',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 6,
  },
});
