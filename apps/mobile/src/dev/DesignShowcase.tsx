/**
 * P7.1 — Écran interne TEMPORAIRE de validation visuelle (dev uniquement).
 * N'est jamais affiché en production (`SHOWCASE = false`).
 * Couvre : tokens, typo, Button, Input, Card, StatusBadge, Stepper,
 * Timeline, ScoreGauge, TrustBanner, EmptyState, Header, Toast.
 */
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { colors, spacing, type } from '../theme/tokens';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, EmptyState, StatusBadge, TrustBanner } from '../components/ui/Cards';
import { ScoreGauge, Stepper, Timeline } from '../components/ui/Progress';
import { Header, Toast } from '../components/ui/Chrome';
import { Logo } from '../components/Logo';

export const SHOWCASE_ENABLED = false;

export function DesignShowcase() {
  const [name, setName] = useState('');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg.app }}>
      <Header variant="brand" hasUnread onBell={() => undefined} />
      <View style={{ padding: spacing.screen, gap: spacing.md }}>
        <View style={{ alignItems: 'center' }}>
          <Logo variant="full" tone="color" height={48} />
        </View>
        <Text style={[type.h1, { color: colors.text.primary }]}>Fondation visuelle P7.1</Text>
        <Button title="Commander une inspection" onPress={() => undefined} />
        <Button title="Continuer" variant="secondary" onPress={() => undefined} />
        <Button title="Voir tout" variant="ghost" onPress={() => undefined} />
        <Button title="Chargement…" loading onPress={() => undefined} />
        <Input label="Nom complet" value={name} onChangeText={setName} placeholder="Nom et prénom" />
        <Input label="Avec erreur" value="" onChangeText={() => undefined} error="Champ requis." />
        <Card>
          <Text style={[type.h3, { color: colors.text.primary }]}>Peugeot 308 — 2019</Text>
          <Text style={[type.body, { color: colors.text.secondary }]}>Alger · 4 500 DA</Text>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge status="BOOKING_REQUESTED" />
          <StatusBadge status="REPORT_READY" />
          <StatusBadge status="IN_PROGRESS" />
          <StatusBadge status="DISPUTED" />
        </View>
        <Stepper step={2} total={5} />
        <Timeline
          steps={[
            { label: 'Demande envoyée', state: 'done' },
            { label: 'Expert assigné', state: 'current' },
            { label: 'Rapport disponible', state: 'todo' },
          ]}
        />
        <Card>
          <ScoreGauge score={86} />
        </Card>
        <TrustBanner />
        <Toast message="Votre demande est confirmée" tone="success" />
        <EmptyState
          icon={<ClipboardList size={48} color={colors.primary[600]} strokeWidth={1.75} />}
          title="Aucune demande"
          message="Lancez votre première inspection en quelques étapes."
          actionTitle="Nouvelle inspection"
          onAction={() => undefined}
        />
      </View>
    </ScrollView>
  );
}
