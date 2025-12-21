/**
 * CareNotesChatScreen
 * Chat/Ghi chú với notes timeline, quick add note, tags chips
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { BottomSheet } from '../../ui/BottomSheet';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Fab } from '../../ui/Fab';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { COLORS, SPACING } from '../../theme';
import { getCareNotes, createCareNote } from '../../services/caregiverPlus.service';
import { CareNote } from '../../types';
import { showSuccess, showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

const NOTE_TAGS = ['Thuốc', 'Bữa ăn', 'Triệu chứng', 'Khác'];

export const CareNotesChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<CareNote[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (patientId) {
      fetchNotes();
    }
  }, [patientId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await getCareNotes(patientId);
      setNotes(data.notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      logger.error('Fetch notes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      showErrorUtil('Lỗi', 'Vui lòng nhập nội dung ghi chú');
      return;
    }

    try {
      await createCareNote(patientId, noteContent, selectedTags);
      showSuccess('Thành công', 'Đã thêm ghi chú');
      setSheetVisible(false);
      setNoteContent('');
      setSelectedTags([]);
      fetchNotes();
    } catch (err: any) {
      showErrorUtil('Lỗi', err.message || 'Không thể thêm ghi chú');
    }
  };

  if (loading && notes.length === 0) {
    return (
      <Screen>
        <AppHeader title="Ghi chú" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải ghi chú..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Ghi chú" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notes.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Chưa có ghi chú"
            message="Thêm ghi chú để theo dõi tình trạng bệnh nhân"
          />
        ) : (
          <View style={styles.notesList}>
            {notes.map((note, index) => (
              <AnimatedCard
                key={note._id}
                entering={FadeInDown.delay(50 + index * 30)}
                style={styles.noteCard}
              >
                <Text variant="body" color="text" style={styles.noteContent}>
                  {note.content}
                </Text>
                {note.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {note.tags.map(tag => (
                      <Chip key={tag} label={tag} variant="secondary" style={styles.tag} />
                    ))}
                  </View>
                )}
                <Text variant="caption" color="textSecondary" style={styles.noteTime}>
                  {new Date(note.createdAt).toLocaleString('vi-VN')}
                </Text>
              </AnimatedCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Fab onPress={() => setSheetVisible(true)} style={styles.fab} />

      <BottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setNoteContent('');
          setSelectedTags([]);
        }}
        height={400}
      >
        <Text variant="title" color="text" style={styles.sheetTitle}>
          Thêm ghi chú
        </Text>
        <Input
          placeholder="Nội dung ghi chú..."
          value={noteContent}
          onChangeText={setNoteContent}
          multiline
          numberOfLines={4}
          containerStyle={styles.input}
        />
        <Text variant="bodySmall" color="text" semibold style={styles.tagsLabel}>
          Tags
        </Text>
        <View style={styles.tagsSelector}>
          {NOTE_TAGS.map(tag => (
            <Chip
              key={tag}
              label={tag}
              variant={selectedTags.includes(tag) ? 'primary' : 'default'}
              onPress={() => handleToggleTag(tag)}
              style={styles.tagChip}
            />
          ))}
        </View>
        <Button
          title="Thêm ghi chú"
          onPress={handleAddNote}
          variant="primary"
          size="large"
          style={styles.submitButton}
        />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  notesList: {
    gap: SPACING.md,
  },
  noteCard: {
    marginBottom: 0,
  },
  noteContent: {
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  tag: {
    marginRight: 0,
  },
  noteTime: {
    marginTop: SPACING.xs,
  },
  fab: {
    bottom: SPACING['2xl'],
    right: SPACING.lg,
  },
  sheetTitle: {
    marginBottom: SPACING.lg,
  },
  input: {
    marginBottom: SPACING.md,
  },
  tagsLabel: {
    marginBottom: SPACING.sm,
  },
  tagsSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tagChip: {
    marginRight: 0,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
});

