'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function CountUpNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.5,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const [hasMounted, setHasMounted] = useState(false);
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
    mass: 1,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => {
    return (
      prefix +
      current.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) +
      suffix
    );
  });

  useEffect(() => {
    setHasMounted(true);
    spring.set(value);
  }, [spring, value]);

  if (!hasMounted) return <span>{prefix}0{suffix}</span>;

  return <motion.span>{display}</motion.span>;
}
