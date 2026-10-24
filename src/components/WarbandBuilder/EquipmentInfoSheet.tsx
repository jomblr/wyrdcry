import React from 'react';
import ReactMarkdown from 'react-markdown';
import InfoSheet from './InfoSheet';
import { itemsData, weaponRulesData, weaponsData } from './data';
import styles from './warband-builder.module.css';

interface Props {
  id: string;
  onClose: () => void;
  natural?: boolean;
  pending?: boolean;
  actions?: React.ReactNode;
}

/** Weapon / item details: stats, special rules and description. */
export default function EquipmentInfoSheet({ id, onClose, natural, pending, actions }: Props) {
  const w = weaponsData.find(x => x.id === id);
  const item = itemsData.find(x => x.id === id);
  const cost = w?.cost ?? item?.cost ?? 0;

  return (
    <InfoSheet
      title={w?.name ?? item?.name ?? id}
      subtitle={(natural ? 'Natural weapon' : w ? `${w.type} weapon · ${cost}gc` : `${item?.type ?? 'Item'} · ${cost}gc`) + (pending ? ' · Not yet purchased' : '')}
      onClose={onClose}
      actions={actions}
    >
      {w && (
        <>
          <div className={styles.statCards}>
            <div className={styles.statCard}>
              <div className={styles.statCardLabel}>Range</div>
              <div className={styles.statCardValue}>{w.range}"</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardLabel}>Attacks</div>
              <div className={styles.statCardValue}>{w.attacks}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardLabel}>Damage</div>
              <div className={styles.statCardValue}>{w.hit}/{w.crit}</div>
            </div>
          </div>
          {w.special_rules.map(ruleId => {
            const rule = weaponRulesData.find(r => r.id === ruleId);
            return (
              <div key={ruleId} className={styles.infoSheetRule}>
                <div className={styles.infoSheetRuleName}>{rule?.name ?? ruleId}</div>
                {rule?.description && <div>{rule.description}</div>}
              </div>
            );
          })}
        </>
      )}
      {item?.description && <ReactMarkdown>{item.description}</ReactMarkdown>}
    </InfoSheet>
  );
}
