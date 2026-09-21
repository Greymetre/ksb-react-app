import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import InvoiceList from './InvoiceList';
import KycList from './KycList';
import SchemeList from './SchemeList';
import { loyaltyTabStyles as styles } from './styles';

type Tab = 'schemes' | 'invoices' | 'kyc';

/**
 * Loyalty, reached from the dashboard tile. Three tabs: what is running, what has been
 * claimed against it, and the KYC of the retailers claiming. Each is mounted on demand
 * rather than in a pager, so opening the screen costs one request.
 */
const Loyalty = ({ navigation }: any) => {
  const [tab, setTab] = useState<Tab>('schemes');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'schemes', label: 'Schemes' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'kyc', label: 'KYC' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map(item => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(item.key)}>
              <AppText
                size={13.5}
                family={active ? 'InterSemiBold' : 'InterMedium'}
                color={active ? 'white' : 'black'}
                opacity={active ? 1 : 0.55}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'schemes' ? <SchemeList /> : tab === 'invoices' ? <InvoiceList navigation={navigation} /> : <KycList navigation={navigation} />}
      </View>
    </View>
  );
};

export default Loyalty;
