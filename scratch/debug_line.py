
with open('/Users/sureshkumar/Downloads/nirva/components/ServiceReportModule.tsx', 'r') as f:
    lines = f.readlines()
    line5 = lines[4]
    print(f"Line 5 length: {len(line5)}")
    print(f"Line 5 content: {repr(line5)}")
    if len(line5) >= 128:
        print(f"Char at index 127 (128th char): {repr(line5[127])}")
        print(f"Around index 127: {repr(line5[120:140])}")
